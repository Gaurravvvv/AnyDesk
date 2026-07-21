import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

let client: RedisClientType | null = null;
let isAttempted = false;
let isConnected = false;

/**
 * Returns the shared Redis client instance, or null if Redis is unreachable/unconfigured.
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (isAttempted) {
    return isConnected ? client : null;
  }

  isAttempted = true;

  // If no REDIS_URL is provided in production environments (like Render without a Redis service), fallback early
  if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    console.log('[Redis] No REDIS_URL provided. Operating in single-instance in-memory mode.');
    return null;
  }

  try {
    const targetUrl = config.redis.url;
    console.log(`[Redis] Connecting to ${targetUrl}...`);

    const tempClient = createClient({
      url: targetUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => {
          if (retries > 2) {
            console.warn('[Redis] Connection failed after retries. Disabling Redis.');
            return new Error('Redis connection timed out');
          }
          return 500;
        },
      },
    });

    tempClient.on('error', (err) => {
      // Suppress spammy error logs if disconnected
      if (isConnected) {
        console.error('[Redis] Connection error:', err.message);
      }
    });

    await tempClient.connect();
    client = tempClient as RedisClientType;
    isConnected = true;
    console.log('[Redis] Connected to Redis successfully.');
    return client;
  } catch (err: any) {
    console.warn(`[Redis] Could not connect to Redis (${err.message}). Falling back to in-memory mode.`);
    client = null;
    isConnected = false;
    return null;
  }
}

/**
 * Gracefully disconnects the Redis client if active.
 */
export async function disconnectRedis(): Promise<void> {
  if (client && isConnected) {
    try {
      await client.quit();
      console.log('[Redis] Disconnected');
    } catch (_) {}
  }
}
