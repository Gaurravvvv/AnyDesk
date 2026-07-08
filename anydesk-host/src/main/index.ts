import { app, BrowserWindow, Menu, Tray, ipcMain, desktopCapturer } from 'electron';
import * as path from 'path';
import { setupTray } from './tray';
import { InputService } from './services/inputService';

let hiddenWindow: BrowserWindow | null = null;
let promptWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const inputService = new InputService();

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
  hiddenWindow = new BrowserWindow({
    width: 400,
    height: 400,
    show: false, // Hidden window for WebRTC & Signaling
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  hiddenWindow.loadFile(path.join(__dirname, '../renderer/hidden.html'));
}

// IPC from hidden window to update tray code
ipcMain.on('room-code-updated', (event, code) => {
  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'AnyDesk Host', enabled: false },
      { type: 'separator' },
      { label: `Room Code: ${code || 'Not Connected'}`, enabled: false },
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
});

// IPC for screen capture source
ipcMain.handle('get-screen-source-id', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  // Just grab the first screen
  return sources[0]?.id;
});

// IPC for showing allow/deny prompt
ipcMain.handle('show-connection-prompt', async (event, viewerId) => {
  return await showPromptWindow(viewerId);
});

// IPC for input events
ipcMain.on('control-event', (event, payload) => {
  inputService.handleEvent(payload);
});

async function showPromptWindow(viewerId: string): Promise<boolean> {
  return new Promise((resolve) => {
    promptWindow = new BrowserWindow({
      width: 400,
      height: 200,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
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
            const { ipcRenderer } = require('electron');
            document.getElementById('allow').onclick = () => ipcRenderer.send('prompt-response', true);
            document.getElementById('deny').onclick = () => ipcRenderer.send('prompt-response', false);
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
