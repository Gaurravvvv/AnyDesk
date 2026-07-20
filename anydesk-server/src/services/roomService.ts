import { generateRoomCode } from '../utils/codeGenerator';
import { config } from '../config';

export interface RoomData {
  hostSocketId: string;
  viewerSocketId?: string;
  status: 'waiting' | 'connecting' | 'active';
  createdAt: number;
}

// In-memory stores
const rooms = new Map<string, RoomData>();
const socketToRoom = new Map<string, string>();

export async function createRoom(hostSocketId: string): Promise<string> {
  const maxRetries = 5;

  for (let i = 0; i < maxRetries; i++) {
    const code = generateRoomCode();

    if (!rooms.has(code)) {
      const roomData: RoomData = {
        hostSocketId,
        status: 'waiting',
        createdAt: Date.now(),
      };
      
      rooms.set(code, roomData);
      socketToRoom.set(hostSocketId, code);
      console.log(`[Room] Created room ${code} for host ${hostSocketId}`);
      return code;
    }
  }

  throw new Error('Failed to generate a unique room code after max retries');
}

export async function validateRoom(code: string): Promise<RoomData | null> {
  const data = await getRoom(code);
  if (!data || data.status !== 'waiting') return null;
  return data;
}

export async function getRoom(code: string): Promise<RoomData | null> {
  return rooms.get(code) || null;
}

export async function updateRoom(
  code: string,
  updates: Partial<RoomData>
): Promise<void> {
  const existing = await getRoom(code);
  if (!existing) return;

  const newData = { ...existing, ...updates };
  rooms.set(code, newData);
  
  // If a viewer was just added, index their socketId too
  if (updates.viewerSocketId) {
    socketToRoom.set(updates.viewerSocketId, code);
  }
}

export async function invalidateRoom(code: string): Promise<void> {
  const room = await getRoom(code);
  if (room) {
    socketToRoom.delete(room.hostSocketId);
    if (room.viewerSocketId) {
      socketToRoom.delete(room.viewerSocketId);
    }
  }
  rooms.delete(code);
  console.log(`[Room] Invalidated room ${code}`);
}

export async function findRoomBySocketId(
  socketId: string
): Promise<{ code: string; data: RoomData } | null> {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  
  const data = await getRoom(code);
  if (!data) return null;
  
  return { code, data };
}
