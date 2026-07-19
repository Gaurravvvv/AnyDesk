import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script — runs in the renderer's isolated context.
 * Exposes only the specific IPC methods the renderer needs.
 */
contextBridge.exposeInMainWorld('hostAPI', {
  // Room code management
  sendRoomCodeUpdated: (code: string | null) => ipcRenderer.send('room-code-updated', code),
  
  // Connection prompt
  showConnectionPrompt: (viewerId: string) => ipcRenderer.invoke('show-connection-prompt', viewerId),
  sendPromptResponse: (approved: boolean) => ipcRenderer.send('prompt-response', approved),
  
  // Screen capture
  getScreenSourceId: () => ipcRenderer.invoke('get-screen-source-id'),
  
  // Control events
  sendControlEvent: (payload: any) => ipcRenderer.send('control-event', payload),
  releaseAllInputs: () => ipcRenderer.send('release-all-inputs'),
  
  // Tray commands (main → renderer)
  onRequestNewCode: (callback: () => void) => {
    ipcRenderer.on('request-new-code', callback);
    return () => ipcRenderer.removeListener('request-new-code', callback);
  },
  onDisconnectSession: (callback: () => void) => {
    ipcRenderer.on('disconnect-session', callback);
    return () => ipcRenderer.removeListener('disconnect-session', callback);
  },
});
