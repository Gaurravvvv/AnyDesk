import { app, Menu, Tray } from 'electron';

export function setupTray(
  app: Electron.App,
  actions: { requestNewCode: () => void, disconnect: () => void }
): Tray {
  const tray = new Tray(createNativeImage());

  const updateContextMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'AnyDesk Host', enabled: false },
      { type: 'separator' },
      { label: `Room Code: Not Connected`, enabled: false },
      { type: 'separator' },
      {
        label: 'Generate New Code',
        click: () => actions.requestNewCode(),
      },
      {
        label: 'Disconnect Viewer',
        click: () => actions.disconnect(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  tray.setToolTip('AnyDesk Host Agent');
  updateContextMenu();

  return tray;
}

function createNativeImage() {
  const { nativeImage } = require('electron');
  // 16x16 transparent image
  const emptyB64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAEUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  return nativeImage.createFromDataURL(`data:image/png;base64,${emptyB64}`);
}
