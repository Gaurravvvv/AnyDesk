// ipcRenderer is no longer directly available — use window.hostAPI from preload
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let dataChannel: RTCDataChannel | null = null;
let currentViewerId: string | null = null;
let currentRoomCode: string | null = null;
let statsInterval: NodeJS.Timeout | null = null;

let pendingIceCandidates: RTCIceCandidateInit[] = [];

function updateUI(code: string | null, status: string, isConnected: boolean) {
  const codeEl = document.getElementById('roomCodeDisplay');
  const statusEl = document.getElementById('statusDisplay');
  const btnNewCode = document.getElementById('btnNewCode');
  const btnDisconnect = document.getElementById('btnDisconnect');

  if (codeEl) codeEl.innerText = code || '------';
  if (statusEl) statusEl.innerText = status;
  
  if (btnNewCode && btnDisconnect) {
    if (isConnected) {
      btnNewCode.classList.add('hidden');
      btnDisconnect.classList.remove('hidden');
    } else {
      btnNewCode.classList.remove('hidden');
      btnDisconnect.classList.add('hidden');
    }
  }
}

// Configuration for WebRTC
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: process.env.TURN_URL || 'turn:openrelay.metered.ca:80',
      username: process.env.TURN_USERNAME || 'openrelayproject',
      credential: process.env.TURN_PASSWORD || 'openrelayproject',
    }
  ]
};

// Connect to signaling server
const SIGNALING_URL = process.env.SIGNALING_URL || 'http://localhost:3001';
socket = io(SIGNALING_URL);

socket.on('connect', () => {
  console.log('Connected to signaling server');
  socket?.emit('create-room');
});

socket.on('room-created', (data: { code: string }) => {
  currentRoomCode = data.code;
  window.hostAPI.sendRoomCodeUpdated(data.code);
  updateUI(data.code, 'Waiting for connection...', false);
});

socket.on('connection-request', async (data: { viewerId: string; roomCode: string }) => {
  // Ask main process to show prompt
  const approved = await window.hostAPI.showConnectionPrompt(data.viewerId);
  socket?.emit('connection-response', { viewerId: data.viewerId, approved, roomCode: data.roomCode });

  if (approved) {
    currentViewerId = data.viewerId;
    currentRoomCode = data.roomCode;
    await startWebRTC();
  }
});

socket.on('sdp-answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
  if (peerConnection) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    // Flush buffered ICE candidates
    for (const candidate of pendingIceCandidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingIceCandidates = [];
  }
});

socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
  if (!data.candidate) return;
  if (peerConnection && peerConnection.remoteDescription) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  } else {
    pendingIceCandidates.push(data.candidate);
  }
});

socket.on('session-ended', () => {
  cleanupSession();
  socket?.emit('create-room'); // get new code
});

// IPC listeners from tray (using hostAPI)
const cleanupNewCode = window.hostAPI.onRequestNewCode(() => {
  cleanupSession();
  socket?.emit('create-room');
});

const cleanupDisconnect = window.hostAPI.onDisconnectSession(() => {
  const roomCode = currentRoomCode;
  cleanupSession();
  socket?.emit('session-ended', { roomCode });
  socket?.emit('create-room');
});

async function startWebRTC() {
  peerConnection = new RTCPeerConnection(rtcConfig);

  // Setup ICE candidate handling
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket?.emit('ice-candidate', { candidate: event.candidate, roomCode: currentRoomCode });
    }
  };

  // Setup data channel for receiving control events
  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      updateUI(currentRoomCode, 'Connected to Viewer!', true);
    };
    channel.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data);
        window.hostAPI.sendControlEvent(payload);
      } catch (e) {
        console.error('Invalid control data', e);
      }
    };
  };

  // Create two channels: unreliable for mouse, reliable for clicks/keys
  const mouseChannel = peerConnection.createDataChannel('mouse', {
    ordered: false,
    maxRetransmits: 0,    // fire-and-forget, like UDP
  });
  const keysChannel = peerConnection.createDataChannel('keys', {
    ordered: true,        // reliable for keystrokes and clicks
  });

  // Use keysChannel as the "primary" for UI status
  setupDataChannel(mouseChannel);
  setupDataChannel(keysChannel);
  dataChannel = keysChannel; // for cleanup reference

  try {
    // Reuse stream if already active to prevent black screen bug on reconnect
    if (!localStream) {
      const sourceId = await window.hostAPI.getScreenSourceId();
      if (!sourceId) throw new Error('No screen source found');

      localStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 60
          }
        } as any
      });
    }

    localStream.getTracks().forEach(track => {
      if (track.kind === 'video') {
        track.contentHint = 'detail';
      }
      peerConnection?.addTrack(track, localStream!);
    });

    // Optimize video sender for latency
    const senders = peerConnection.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');
    if (videoSender) {
      const params = videoSender.getParameters();
      
      // Initialize encodings if empty (required for some browsers)
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      
      params.encodings[0] = {
        ...params.encodings[0],
        maxBitrate: 2_500_000,          // 2.5 Mbps cap — good for 1080p desktop
        maxFramerate: 30,               // start at 30fps, save bandwidth
        // Note: scaleResolutionDownBy is not set = native resolution
      };
      params.degradationPreference = 'maintain-resolution';
      
      await videoSender.setParameters(params);
    }

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // Send offer to viewer
    socket?.emit('sdp-offer', { sdp: offer, roomCode: currentRoomCode });

    // ── Adaptive quality monitor ──
    let lastBytesSent = 0;
    let lastTimestamp = 0;
    
    statsInterval = setInterval(async () => {
      if (!peerConnection) {
        if (statsInterval) clearInterval(statsInterval);
        return;
      }
      
      try {
        const stats = await peerConnection.getStats();
        stats.forEach((report: any) => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            const now = report.timestamp;
            const bytesSent = report.bytesSent || 0;
            
            // Calculate current bitrate
            if (lastTimestamp > 0) {
              const timeDelta = (now - lastTimestamp) / 1000;
              const bitrate = ((bytesSent - lastBytesSent) * 8) / timeDelta;
              const packetLoss = report.packetsLost || 0;
              const totalPackets = report.packetsSent || 1;
              const lossRate = packetLoss / totalPackets;
              
              console.log(`[Stats] Bitrate: ${(bitrate / 1_000_000).toFixed(2)} Mbps | Loss: ${(lossRate * 100).toFixed(1)}% | FPS: ${report.framesPerSecond || 'N/A'}`);
              
              // Adaptive quality: degrade if losing packets
              const videoSender = peerConnection?.getSenders().find(s => s.track?.kind === 'video');
              if (videoSender) {
                const params = videoSender.getParameters();
                if (params.encodings && params.encodings[0]) {
                  const currentMax = params.encodings[0].maxBitrate || 2_500_000;
                  
                  if (lossRate > 0.05 && currentMax > 500_000) {
                    // High packet loss — reduce bitrate by 25%
                    params.encodings[0].maxBitrate = Math.round(currentMax * 0.75);
                    videoSender.setParameters(params);
                    console.log(`[Stats] ⬇ Reduced bitrate to ${params.encodings[0].maxBitrate}`);
                  } else if (lossRate < 0.01 && currentMax < 4_000_000) {
                    // Low packet loss — increase bitrate by 10%
                    params.encodings[0].maxBitrate = Math.round(currentMax * 1.10);
                    videoSender.setParameters(params);
                    console.log(`[Stats] ⬆ Increased bitrate to ${params.encodings[0].maxBitrate}`);
                  }
                }
              }
            }
            
            lastBytesSent = bytesSent;
            lastTimestamp = now;
          }
        });
      } catch (e) {
        // Stats not available yet
      }
    }, 3000); // Check every 3 seconds

  } catch (err) {
    console.error('Failed to setup WebRTC', err);
    cleanupSession();
  }
}

function cleanupSession() {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
  pendingIceCandidates = [];
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  // We explicitly DO NOT stop the localStream here. 
  // Re-requesting desktop capture in Electron without a full reload 
  // can cause it to silently fail and emit black frames.
  
  currentViewerId = null;
  window.hostAPI.releaseAllInputs();
  window.hostAPI.sendRoomCodeUpdated(null);
  updateUI(null, 'Initializing...', false);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnNewCode')?.addEventListener('click', () => {
    cleanupSession();
    socket?.emit('create-room');
  });

  document.getElementById('btnDisconnect')?.addEventListener('click', () => {
    const roomCode = currentRoomCode;
    cleanupSession();
    socket?.emit('session-ended', { roomCode });
    socket?.emit('create-room');
  });
});
