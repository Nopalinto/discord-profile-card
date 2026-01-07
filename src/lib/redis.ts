import { createClient } from 'redis';

let redis: ReturnType<typeof createClient> | null = null;

/**
 * Get or create Redis client singleton
 * Handles connection pooling and reconnection automatically
 */
export async function getRedisClient() {
  if (redis && redis.isOpen) return redis;

  try {
    const redisUrl = process.env.KV_URL || process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('Redis URL not configured. Please set KV_URL or REDIS_URL environment variable.');
    }

    const needsTls = redisUrl.startsWith('rediss://') || redisUrl.includes(':6380');
    
    // Reconnect strategy: wait 100ms * retries, up to 3s, max 10 retries
    const reconnectStrategy = (retries: number) => {
      if (retries > 10) {
        return new Error('Too many reconnection attempts');
      }
      return Math.min(retries * 100, 3000);
    };

    if (needsTls) {
      redis = createClient({
        url: redisUrl,
        socket: {
          tls: true,
          reconnectStrategy,
        },
      });
    } else {
      redis = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy,
        },
      });
    }

    redis.on('error', (err) => console.error('Redis Client Error:', err));
    await redis.connect();
    return redis;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Redis key generation utilities
 * Centralized location for all Redis key patterns
 */
export const RedisKeys = {
  activities: (userId: string) => `discord-activities:${userId}`,
  streaks: (userId: string) => `discord-streaks:${userId}`,
  history: (userId: string) => `discord-history:${userId}`,
  rawgKey: (userId: string) => `discord-rawg-key:${userId}`,
  trackedUsers: () => 'discord-activities:tracked-users',
  internalState: (userId: string) => `discord-internal-state:${userId}`,
} as const;
