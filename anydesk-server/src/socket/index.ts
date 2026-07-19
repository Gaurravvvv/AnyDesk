import { Server, Socket } from 'socket.io';
import { registerRoomHandlers } from './roomHandlers';
import { registerSignalingHandlers } from './signalingHandlers';
import { findRoomBySocketId, invalidateRoom } from '../services/roomService';
import { clearRateLimit } from '../utils/rateLimiter';

/**
 * Initializes all Socket.io event handlers for each new connection.
 */
export function initializeSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Register handler groups
    registerRoomHandlers(io, socket);
    registerSignalingHandlers(io, socket);

    /**
     * Session teardown — triggered when either peer explicitly ends the session.
     * Notifies the other peer and invalidates the room.
     */
    socket.on('session-ended', async (data?: { roomCode?: string }) => {
      try {
        const roomCode = data?.roomCode || (socket as any).roomCode;
        if (!roomCode) return;

        const room = await findRoomBySocketId(socket.id);
        if (!room) return;

        // Determine the other peer
        const otherSocketId =
          socket.id === room.data.hostSocketId
            ? room.data.viewerSocketId
            : room.data.hostSocketId;

        // Notify the other peer
        if (otherSocketId) {
          io.to(otherSocketId).emit('session-ended', {
            reason: 'The other peer ended the session',
          });
        }

        // Clean up the room
        await invalidateRoom(room.code);
        console.log(`[Socket] Session ended by ${socket.id} in room ${room.code}`);
      } catch (err: any) {
        console.error('[Socket] Error during session teardown:', err.message);
      }
    });

    /**
     * Disconnect cleanup — runs when a socket drops (tab close, network loss, etc.).
     * Ensures the other peer is notified and the room is cleaned up.
     */
    socket.on('disconnect', async (reason: string) => {
      clearRateLimit(socket.id);
      console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);

      try {
        const room = await findRoomBySocketId(socket.id);
        if (!room) return;

        // Determine the other peer
        const otherSocketId =
          socket.id === room.data.hostSocketId
            ? room.data.viewerSocketId
            : room.data.hostSocketId;

        // Notify the other peer that the session has ended
        if (otherSocketId) {
          io.to(otherSocketId).emit('session-ended', {
            reason: 'The other peer disconnected',
          });
        }

        // Invalidate the room
        await invalidateRoom(room.code);
        console.log(`[Socket] Cleaned up room ${room.code} after disconnect`);
      } catch (err: any) {
        console.error('[Socket] Error during disconnect cleanup:', err.message);
      }
    });
  });
}
