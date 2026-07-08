import { Server, Socket } from 'socket.io';
import { getRoom } from '../services/roomService';

/**
 * Registers WebRTC signaling event handlers.
 *
 * These are pure relay handlers — they receive SDP offers/answers and ICE candidates
 * from one peer and forward them to the other. No data is persisted.
 *
 * Events:
 * - sdp-offer:      Host → Server → Viewer
 * - sdp-answer:     Viewer → Server → Host
 * - ice-candidate:  Either → Server → Other
 */
export function registerSignalingHandlers(io: Server, socket: Socket): void {
  /**
   * Host sends SDP offer → relay to viewer.
   */
  socket.on('sdp-offer', async (data: { roomCode: string; sdp: any }) => {
    try {
      const room = await getRoom(data.roomCode);
      if (!room || !room.viewerSocketId) {
        console.warn(`[Signaling] sdp-offer: No viewer found for room ${data.roomCode}`);
        return;
      }

      console.log(`[Signaling] Relaying SDP offer from host to viewer in room ${data.roomCode}`);
      io.to(room.viewerSocketId).emit('sdp-offer', {
        sdp: data.sdp,
        roomCode: data.roomCode,
      });
    } catch (err: any) {
      console.error('[Signaling] Error relaying SDP offer:', err.message);
    }
  });

  /**
   * Viewer sends SDP answer → relay to host.
   */
  socket.on('sdp-answer', async (data: { roomCode: string; sdp: any }) => {
    try {
      const room = await getRoom(data.roomCode);
      if (!room) {
        console.warn(`[Signaling] sdp-answer: No room found for ${data.roomCode}`);
        return;
      }

      console.log(`[Signaling] Relaying SDP answer from viewer to host in room ${data.roomCode}`);
      io.to(room.hostSocketId).emit('sdp-answer', {
        sdp: data.sdp,
        roomCode: data.roomCode,
      });
    } catch (err: any) {
      console.error('[Signaling] Error relaying SDP answer:', err.message);
    }
  });

  /**
   * Either peer sends an ICE candidate → relay to the other.
   */
  socket.on(
    'ice-candidate',
    async (data: { roomCode: string; candidate: any }) => {
      try {
        const room = await getRoom(data.roomCode);
        if (!room) {
          console.warn(`[Signaling] ice-candidate: No room found for ${data.roomCode}`);
          return;
        }

        // Determine the target: if sender is host, send to viewer; vice versa
        const targetSocketId =
          socket.id === room.hostSocketId ? room.viewerSocketId : room.hostSocketId;

        if (!targetSocketId) {
          console.warn(`[Signaling] ice-candidate: No target peer for room ${data.roomCode}`);
          return;
        }

        io.to(targetSocketId).emit('ice-candidate', {
          candidate: data.candidate,
          roomCode: data.roomCode,
        });
      } catch (err: any) {
        console.error('[Signaling] Error relaying ICE candidate:', err.message);
      }
    }
  );
}
