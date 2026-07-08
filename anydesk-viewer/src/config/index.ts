export const config = {
  signalingServer: import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001',

  iceServers: [
    // Google's free STUN server — works for most P2P connections
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Metered.ca TURN support
    ...(import.meta.env.VITE_TURN_URL
      ? [
          {
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_PASSWORD,
          },
        ]
      : []),
  ] as RTCIceServer[],

  // Control event throttle (ms) — caps mousemove at ~60fps
  inputThrottleMs: 16,

  // Control bar auto-hide delay (ms)
  controlBarHideDelay: 3000,

  // Control bar trigger zone (px from top)
  controlBarTriggerZone: 40,
};
