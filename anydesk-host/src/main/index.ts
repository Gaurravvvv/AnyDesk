import { app, BrowserWindow, Menu, Tray, ipcMain, desktopCapturer } from 'electron';
import * as path from 'path';
import { setupTray } from './tray';
import { InputService } from './services/inputService';

let hiddenWindow: BrowserWindow | null = null;
let promptWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const inputService = new InputService();

// Disable WebRTC mDNS to allow local network testing without TURN
app.commandLine.appendSwitch('disable-webrtc-hide-local-ips-with-mdns');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

app.whenReady().then(() => {
  // Create system tray
  tray = setupTray(app, {
    requestNewCode: () => hiddenWindow?.webContents.send('request-new-code'),
    disconnect: () => hiddenWindow?.webContents.send('disconnect-session')
  });

  createHiddenWindow();

  app.on('activate', function () {
    // macOS behavior
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

function createHiddenWindow() {
  // Signaling URL is baked into hidden.js at compile time by build-renderer.js.
  // No runtime resolution needed — this eliminates the localhost fallback bug.

  hiddenWindow = new BrowserWindow({
    width: 400,
    height: 350,
    show: true,
    title: 'AnyDesk Host',
    resizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
      backgroundThrottling: false
    }
  });

  hiddenWindow.loadFile(path.join(__dirname, '../renderer/hidden.html'));
  
  hiddenWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer]: ${message}`);
  });
}

let activeSourceId: string | null = null;
let currentRoomCode: string | null = null;

async function updateTrayMenu(code: string | null) {
  if (!tray) return;
  let sources: Electron.DesktopCapturerSource[] = [];
  try {
    sources = await desktopCapturer.getSources({ types: ['screen'] });
  } catch (err) {
    console.error('Failed to get screen sources:', err);
  }
  
  if (!activeSourceId && sources.length > 0) {
    activeSourceId = sources[0].id;
  }

  const screenItems: Electron.MenuItemConstructorOptions[] = sources.map(source => ({
    label: source.name,
    type: 'radio',
    checked: activeSourceId === source.id,
    click: () => {
      activeSourceId = source.id;
    }
  }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'AnyDesk Host', enabled: false },
    { type: 'separator' },
    { label: `Room Code: ${code || 'Not Connected'}`, enabled: false },
    { type: 'separator' },
    { label: 'Share Display', submenu: screenItems },
    { type: 'separator' },
    {
      label: 'Generate New Code',
      click: () => hiddenWindow?.webContents.send('request-new-code'),
    },
    {
      label: 'Disconnect Viewer',
      click: () => hiddenWindow?.webContents.send('disconnect-session'),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(contextMenu);
}

// IPC from hidden window to update tray code
ipcMain.on('room-code-updated', (event, code) => {
  currentRoomCode = code;
  updateTrayMenu(code);
});

// IPC for screen capture source
ipcMain.handle('get-screen-source-id', async () => {
  if (activeSourceId) return activeSourceId;
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  if (sources.length > 0) {
    activeSourceId = sources[0].id;
    return activeSourceId;
  }
  return null;
});

// IPC for showing allow/deny prompt
ipcMain.handle('show-connection-prompt', async (event, viewerId) => {
  return await showPromptWindow(viewerId);
});

// IPC for input events
ipcMain.on('control-event', (event, payload) => {
  if (payload.type !== 'mousemove') {
    console.log(`[Host IPC] Received control-event: ${payload.type}`);
  }
  inputService.handleEvent(payload);
});

ipcMain.on('release-all-inputs', () => {
  inputService.releaseAllInputs();
});

async function showPromptWindow(viewerId: string): Promise<boolean> {
  return new Promise((resolve) => {
    promptWindow = new BrowserWindow({
      width: 400,
      height: 200,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      }
    });

    const html = `
      <html>
        <body style="font-family: sans-serif; background: #232328; color: #e4e4e7; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; -webkit-app-region: drag;">
          <h2 style="font-weight: 300;">Incoming Connection</h2>
          <p>A viewer wants to control your screen.</p>
          <div style="margin-top: 20px; -webkit-app-region: no-drag;">
            <button id="allow" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Allow</button>
            <button id="deny" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 5px; cursor: pointer;">Deny</button>
          </div>
          <script>
            document.getElementById('allow').onclick = () => window.hostAPI?.sendPromptResponse?.(true);
            document.getElementById('deny').onclick = () => window.hostAPI?.sendPromptResponse?.(false);
          </script>
        </body>
      </html>
    `;
    promptWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const timeout = setTimeout(() => {
      if (promptWindow) {
        promptWindow.close();
        resolve(false);
      }
    }, 30000);

    ipcMain.once('prompt-response', (event, approved: boolean) => {
      clearTimeout(timeout);
      if (promptWindow) {
        promptWindow.close();
        promptWindow = null;
      }
      resolve(approved);
    });
  });
}
