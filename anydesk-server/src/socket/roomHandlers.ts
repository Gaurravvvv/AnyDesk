import { Server, Socket } from 'socket.io';
import {
  createRoom,
  validateRoom,
  updateRoom,
  invalidateRoom,
  getRoom,
} from '../services/roomService';
import { isRateLimited } from '../utils/rateLimiter';

/**
 * Registers room-related Socket.io event handlers.
 *
 * Events:
 * - create-room:         Host requests a new room code
 * - join-room:           Viewer submits a room code to connect
 * - connection-response: Host approves or denies the viewer
 */
export function registerRoomHandlers(io: Server, socket: Socket): void {
  /**
   * Host requests a new room.
   * Creates a room in Redis and returns the code.
   */
  socket.on('create-room', async (callback?: (response: any) => void) => {
    if (isRateLimited(socket.id, { maxEvents: 5, windowMs: 60_000 })) {
      console.warn(`[Room] Rate limited: ${socket.id}`);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Too many requests. Try again later.' });
      }
      return;
    }
    try {
      const code = await createRoom(socket.id);
      // Store the room code on the socket for easy cleanup
      (socket as any).roomCode = code;

      console.log(`[Room] Host ${socket.id} created room ${code}`);

      if (typeof callback === 'function') {
        callback({ success: true, code });
      }

      socket.emit('room-created', { code });
    } catch (err: any) {
      console.error('[Room] Failed to create room:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to create room' });
      }
    }
  });

  /**
   * Viewer submits a room code to request access.
   * Validates the code, then notifies the host.
   */
  socket.on('join-room', async (data: { code: string }, callback?: (response: any) => void) => {
    if (isRateLimited(socket.id, { maxEvents: 10, windowMs: 60_000 })) {
      console.warn(`[Room] Rate limited join: ${socket.id}`);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Too many attempts. Try again later.' });
      }
      return;
    }
    try {
      const code = data.code?.toUpperCase()?.trim();

      if (!code) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Room code is required' });
        }
        return;
      }

      const room = await validateRoom(code);

      if (!room) {
        console.log(`[Room] Viewer ${socket.id} tried invalid/expired code: ${code}`);
        socket.emit('connection-denied', { reason: 'Invalid or expired room code' });
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Invalid or expired room code' });
        }
        return;
      }

      // Update room status and store viewer socket ID
      await updateRoom(code, {
        viewerSocketId: socket.id,
        status: 'connecting',
      });

      // Store the room code on the viewer socket for cleanup
      (socket as any).roomCode = code;

      console.log(`[Room] Viewer ${socket.id} requesting access to room ${code}`);

      // Notify the host of the incoming connection request
      io.to(room.hostSocketId).emit('connection-request', {
        viewerId: socket.id,
        roomCode: code,
      });

      if (typeof callback === 'function') {
        callback({ success: true, message: 'Requesting access from host...' });
      }
    } catch (err: any) {
      console.error('[Room] Error joining room:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to join room' });
      }
    }
  });

  /**
   * Host approves or denies the viewer's connection request.
   */
  socket.on(
    'connection-response',
    async (data: { viewerId: string; approved: boolean; roomCode: string }) => {
      try {
        const { viewerId, approved, roomCode } = data;

        if (approved) {
          // Update room to active
          await updateRoom(roomCode, { status: 'active' });

          console.log(`[Room] Host approved viewer ${viewerId} in room ${roomCode}`);

          // Tell the viewer they've been approved — signaling can begin
          io.to(viewerId).emit('connection-approved', { roomCode });
        } else {
          console.log(`[Room] Host denied viewer ${viewerId} in room ${roomCode}`);

          // Invalidate the room — single-use, even on denial
          await invalidateRoom(roomCode);

          // Notify viewer
          io.to(viewerId).emit('connection-denied', { reason: 'Host denied the connection' });
        }
      } catch (err: any) {
        console.error('[Room] Error handling connection response:', err.message);
      }
    }
  );
}
