import { generateRoomCode } from '../utils/codeGenerator';
import { config } from '../config';
import { getRedisClient } from './redisClient';

export interface RoomData {
  hostSocketId: string;
  viewerSocketId?: string;
  status: 'waiting' | 'connecting' | 'active';
  createdAt: number;
}

const ROOM_PREFIX = 'room:';

export async function createRoom(hostSocketId: string): Promise<string> {
  const redis = await getRedisClient();
  const maxRetries = 5;

  for (let i = 0; i < maxRetries; i++) {
    const code = generateRoomCode();
    const key = ROOM_PREFIX + code;

    const exists = await redis.exists(key);
    if (!exists) {
      const roomData: RoomData = {
        hostSocketId,
        status: 'waiting',
        createdAt: Date.now(),
      };
      
      await redis.set(key, JSON.stringify(roomData), {
        EX: config.room.codeTtlSeconds
      });
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
  const redis = await getRedisClient();
  const dataStr = await redis.get(ROOM_PREFIX + code);
  return dataStr ? JSON.parse(dataStr) as RoomData : null;
}

export async function updateRoom(
  code: string,
  updates: Partial<RoomData>
): Promise<void> {
  const redis = await getRedisClient();
  const existing = await getRoom(code);
  if (!existing) return;

  const newData = { ...existing, ...updates };
  await redis.set(ROOM_PREFIX + code, JSON.stringify(newData), {
    KEEPTTL: true
  });
}

export async function invalidateRoom(code: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(ROOM_PREFIX + code);
  console.log(`[Room] Invalidated room ${code}`);
}

export async function findRoomBySocketId(
  socketId: string
): Promise<{ code: string; data: RoomData } | null> {
  const redis = await getRedisClient();
  const keys = await redis.keys(ROOM_PREFIX + '*');
  
  for (const key of keys) {
    const dataStr = await redis.get(key);
    if (dataStr) {
      const data = JSON.parse(dataStr) as RoomData;
      if (data.hostSocketId === socketId || data.viewerSocketId === socketId) {
        return { code: key.replace(ROOM_PREFIX, ''), data };
      }
    }
  }
  return null;
}
