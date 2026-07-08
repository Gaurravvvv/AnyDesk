import { ipcRenderer } from 'electron';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let dataChannel: RTCDataChannel | null = null;
let currentViewerId: string | null = null;

// Configuration for WebRTC
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(process.env.TURN_URL
      ? [
          {
            urls: process.env.TURN_URL,
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_PASSWORD,
          },
        ]
      : []),
  ]
};

// Connect to signaling server
socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to signaling server');
  socket?.emit('create-room');
});

socket.on('room-created', (data: { code: string }) => {
  ipcRenderer.send('room-code-updated', data.code);
});

let currentRoomCode: string | null = null;

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
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data);
        ipcRenderer.send('control-event', payload);
      } catch (e) {
        console.error('Invalid control data', e);
      }
    };
  };

  // Create DataChannel (just in case viewer waits for it, though viewer also creates it)
  // Usually the peer that creates the offer creates the data channel.
  dataChannel = peerConnection.createDataChannel('control');

  try {
    // Get screen stream
    const sourceId = await ipcRenderer.invoke('get-screen-source-id');
    if (!sourceId) throw new Error('No screen source found');

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      } as any
    });

    localStream.getTracks().forEach(track => {
      peerConnection?.addTrack(track, localStream!);
    });

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
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  currentViewerId = null;
  ipcRenderer.send('room-code-updated', null);
}
