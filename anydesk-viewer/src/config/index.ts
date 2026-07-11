export const config = {
  signalingServer: import.meta.env.VITE_SIGNALING_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001'),

  iceServers: [
    // Google's free STUN server — works for most P2P connections
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Metered.ca TURN support (using public openrelay for testing if env is missing)
    {
      urls: import.meta.env.VITE_TURN_URL || 'turn:openrelay.metered.ca:80',
      username: import.meta.env.VITE_TURN_USERNAME || 'openrelayproject',
      credential: import.meta.env.VITE_TURN_PASSWORD || 'openrelayproject',
    }
  ] as RTCIceServer[],

  // Control event throttle (ms) — caps mousemove at ~60fps
  inputThrottleMs: 16,

  // Control bar auto-hide delay (ms)
  controlBarHideDelay: 3000,

  // Control bar trigger zone (px from top)
  controlBarTriggerZone: 40,
};
