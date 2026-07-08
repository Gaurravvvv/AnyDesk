import { io, Socket } from 'socket.io-client';
import { config } from '../config';

export type SignalingEvents = {
  // Incoming from server
  'room-created': (data: { code: string }) => void;
  'connection-request': (data: { viewerId: string; roomCode: string }) => void;
  'connection-approved': (data: { roomCode: string }) => void;
  'connection-denied': (data: { reason: string }) => void;
  'sdp-offer': (data: { sdp: RTCSessionDescriptionInit; roomCode: string }) => void;
  'sdp-answer': (data: { sdp: RTCSessionDescriptionInit; roomCode: string }) => void;
  'ice-candidate': (data: { candidate: RTCIceCandidateInit; roomCode: string }) => void;
  'session-ended': (data: { reason: string }) => void;
};

let socket: Socket | null = null;

/**
 * Returns the shared Socket.io instance, creating it on first call.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(config.signalingServer, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/**
 * Connects the socket if not already connected.
 */
export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

/**
 * Disconnects and destroys the socket instance.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
