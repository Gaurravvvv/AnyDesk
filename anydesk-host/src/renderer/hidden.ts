import { ipcRenderer } from 'electron';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let dataChannel: RTCDataChannel | null = null;
let currentViewerId: string | null = null;
let currentRoomCode: string | null = null;

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
socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to signaling server');
  socket?.emit('create-room');
});

socket.on('room-created', (data: { code: string }) => {
  currentRoomCode = data.code;
  ipcRenderer.send('room-code-updated', data.code);
  updateUI(data.code, 'Waiting for connection...', false);
});

socket.on('connection-request', async (data: { viewerId: string; roomCode: string }) => {
  // Ask main process to show prompt
  const approved = await ipcRenderer.invoke('show-connection-prompt', data.viewerId);
  socket?.emit('connection-response', { viewerId: data.viewerId, approved, roomCode: data.roomCode });

  if (approved) {
    currentViewerId = data.viewerId;
    currentRoomCode = data.roomCode;
    await startWebRTC();
  }
});

socket.on('sdp-offer', async (data: { sdp: RTCSessionDescriptionInit }) => {
  // If we receive an offer from viewer, answer it. But in our design, Host usually creates the offer.
  // Wait, viewer web app might expect an offer. Let's send an offer to viewer.
});

socket.on('sdp-answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
  if (peerConnection) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  }
});

socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
  if (peerConnection) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

socket.on('session-ended', () => {
  cleanupSession();
  socket?.emit('create-room'); // get new code
});

// IPC listeners from tray
ipcRenderer.on('request-new-code', () => {
  cleanupSession();
  socket?.emit('create-room');
});

ipcRenderer.on('disconnect-session', () => {
  cleanupSession();
  socket?.emit('session-ended');
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
        ipcRenderer.send('control-event', payload);
      } catch (e) {
        console.error('Invalid control data', e);
      }
    };
  };

  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel(dataChannel);
  };

  // Create DataChannel since host creates the offer
  dataChannel = peerConnection.createDataChannel('control');
  setupDataChannel(dataChannel);

  try {
    // Reuse stream if already active to prevent black screen bug on reconnect
    if (!localStream) {
      const sourceId = await ipcRenderer.invoke('get-screen-source-id');
      if (!sourceId) throw new Error('No screen source found');

      localStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: 1280,
            maxHeight: 720,
            maxFrameRate: 30
          }
        } as any
      });
    }

    localStream.getTracks().forEach(track => {
      if (track.kind === 'video') {
        track.contentHint = 'motion';
      }
      peerConnection?.addTrack(track, localStream!);
    });

    // Optimize video sender for latency
    const senders = peerConnection.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');
    if (videoSender) {
      const parameters = videoSender.getParameters();
      if (!parameters.degradationPreference) {
        parameters.degradationPreference = 'maintain-framerate';
      }
      videoSender.setParameters(parameters);
    }

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // Send offer to viewer
    socket?.emit('sdp-offer', { sdp: offer, roomCode: currentRoomCode });
  } catch (err) {
    console.error('Failed to setup WebRTC', err);
    cleanupSession();
  }
}

function cleanupSession() {
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
  ipcRenderer.send('release-all-inputs');
  ipcRenderer.send('room-code-updated', null);
  updateUI(null, 'Initializing...', false);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnNewCode')?.addEventListener('click', () => {
    cleanupSession();
    socket?.emit('create-room');
  });

  document.getElementById('btnDisconnect')?.addEventListener('click', () => {
    cleanupSession();
    socket?.emit('session-ended');
    socket?.emit('create-room');
  });
});
