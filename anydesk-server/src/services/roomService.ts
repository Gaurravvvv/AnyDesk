import { generateRoomCode } from '../utils/codeGenerator';
import { getRedisClient } from './redisClient';

export interface RoomData {
  hostSocketId: string;
  viewerSocketId?: string;
  status: 'waiting' | 'connecting' | 'active';
  createdAt: number;
}

const ROOM_TTL = 3600; // 1 hour expiration for memory safety

// In-memory fallback stores (used if Redis is unconfigured or unreachable)
const memoryRooms = new Map<string, RoomData>();
const memorySocketToRoom = new Map<string, string>();

export async function createRoom(hostSocketId: string): Promise<string> {
  const client = await getRedisClient();
  const maxRetries = 5;

  for (let i = 0; i < maxRetries; i++) {
    const code = generateRoomCode();
    const roomData: RoomData = {
      hostSocketId,
      status: 'waiting',
      createdAt: Date.now(),
    };

    if (client) {
      const success = await client.set(`room:${code}`, JSON.stringify(roomData), {
        NX: true,
        EX: ROOM_TTL,
      });

      if (success) {
        await client.set(`socket:${hostSocketId}`, code, { EX: ROOM_TTL });
        console.log(`[Room] Created room ${code} (Redis) for host ${hostSocketId}`);
        return code;
      }
    } else {
      if (!memoryRooms.has(code)) {
        memoryRooms.set(code, roomData);
        memorySocketToRoom.set(hostSocketId, code);
        console.log(`[Room] Created room ${code} (In-Memory) for host ${hostSocketId}`);
        return code;
      }
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
  const client = await getRedisClient();
  if (client) {
    const raw = await client.get(`room:${code}`);
    if (!raw) return null;
    return JSON.parse(raw) as RoomData;
  }
  return memoryRooms.get(code) || null;
}

export async function updateRoom(
  code: string,
  updates: Partial<RoomData>
): Promise<void> {
  const client = await getRedisClient();
  const existing = await getRoom(code);
  if (!existing) return;

  const newData = { ...existing, ...updates };

  if (client) {
    await client.set(`room:${code}`, JSON.stringify(newData), { EX: ROOM_TTL });
    if (updates.viewerSocketId) {
      await client.set(`socket:${updates.viewerSocketId}`, code, { EX: ROOM_TTL });
    }
  } else {
    memoryRooms.set(code, newData);
    if (updates.viewerSocketId) {
      memorySocketToRoom.set(updates.viewerSocketId, code);
    }
  }
}

export async function invalidateRoom(code: string): Promise<void> {
  const client = await getRedisClient();
  const room = await getRoom(code);

  if (client) {
    if (room) {
      await client.del(`socket:${room.hostSocketId}`);
      if (room.viewerSocketId) {
        await client.del(`socket:${room.viewerSocketId}`);
      }
    }
    await client.del(`room:${code}`);
  } else {
    if (room) {
      memorySocketToRoom.delete(room.hostSocketId);
      if (room.viewerSocketId) {
        memorySocketToRoom.delete(room.viewerSocketId);
      }
    }
    memoryRooms.delete(code);
  }
  console.log(`[Room] Invalidated room ${code}`);
}

export async function findRoomBySocketId(
  socketId: string
): Promise<{ code: string; data: RoomData } | null> {
  const client = await getRedisClient();
  if (client) {
    const code = await client.get(`socket:${socketId}`);
    if (!code) return null;
    const data = await getRoom(code);
    if (!data) return null;
    return { code, data };
  } else {
    const code = memorySocketToRoom.get(socketId);
    if (!code) return null;
    const data = await getRoom(code);
    if (!data) return null;
    return { code, data };
  }
}
