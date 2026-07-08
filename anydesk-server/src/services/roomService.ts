import { generateRoomCode } from '../utils/codeGenerator';
import { config } from '../config';

export interface RoomData {
  hostSocketId: string;
  viewerSocketId?: string;
  status: 'waiting' | 'connecting' | 'active';
  createdAt: number;
  expireTimer?: NodeJS.Timeout;
}

// In-memory store fallback instead of Redis since Docker is failing
const rooms = new Map<string, RoomData>();

export async function createRoom(hostSocketId: string): Promise<string> {
  const maxRetries = 5;

  for (let i = 0; i < maxRetries; i++) {
    const code = generateRoomCode();

    if (!rooms.has(code)) {
      // Auto-expire after TTL
      const expireTimer = setTimeout(() => {
        rooms.delete(code);
        console.log(`[Room] Room ${code} auto-expired`);
      }, config.room.codeTtlSeconds * 1000);

      rooms.set(code, {
        hostSocketId,
        status: 'waiting',
        createdAt: Date.now(),
        expireTimer
      });
      console.log(`[Room] Created room ${code} for host ${hostSocketId}`);
      return code;
    }
  }

  throw new Error('Failed to generate a unique room code after max retries');
}

export async function validateRoom(code: string): Promise<RoomData | null> {
  const data = rooms.get(code);
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
  const existing = rooms.get(code);
  if (!existing) return;

  Object.assign(existing, updates);
}

export async function invalidateRoom(code: string): Promise<void> {
  const data = rooms.get(code);
  if (data?.expireTimer) {
    clearTimeout(data.expireTimer);
  }
  rooms.delete(code);
  console.log(`[Room] Invalidated room ${code}`);
}

export async function findRoomBySocketId(
  socketId: string
): Promise<{ code: string; data: RoomData } | null> {
  for (const [code, data] of rooms.entries()) {
    if (data.hostSocketId === socketId || data.viewerSocketId === socketId) {
      return { code, data };
    }
  }
  return null;
}
