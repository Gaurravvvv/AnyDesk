export interface HostAPI {
  sendRoomCodeUpdated: (code: string | null) => void;
  showConnectionPrompt: (viewerId: string) => Promise<boolean>;
  sendPromptResponse: (approved: boolean) => void;
  getScreenSourceId: () => Promise<string | null>;
  sendControlEvent: (payload: any) => void;
  releaseAllInputs: () => void;
  onRequestNewCode: (callback: () => void) => () => void;
  onDisconnectSession: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    hostAPI: HostAPI;
  }
}
