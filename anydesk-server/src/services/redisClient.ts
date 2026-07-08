import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

let client: RedisClientType;

/**
 * Returns the shared Redis client instance.
 * Creates and connects on first call.
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({ url: config.redis.url });

    client.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    client.on('connect', () => {
      console.log('[Redis] Connected to', config.redis.url);
    });

    client.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    await client.connect();
  }

  return client;
}

/**
 * Gracefully disconnects the Redis client.
 */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    console.log('[Redis] Disconnected');
  }
}
