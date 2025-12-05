import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';
import type { LanyardActivity, LanyardSpotify } from '@/lib/types/lanyard';
import { isValidDiscordId } from '@/lib/utils/validation';

// Activity data structure stored in Redis
interface ActivityData {
  activities: LanyardActivity[];
  spotify: LanyardSpotify | null;
  updatedAt: number;
}

// Clean up old entries (older than 90 days)
const MAX_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days - activities persist for a long time

// Helper function to get Redis key for a user
function getKey(userId: string): string {
  return `discord-activities:${userId}`;
}

// Initialize Redis client
// For Vercel KV or Redis Labs, use REDIS_URL or KV_URL environment variable
let redis: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (redis && redis.isOpen) {
    return redis;
  }

  try {
    const redisUrl = process.env.KV_URL || process.env.REDIS_URL;
    
    if (!redisUrl) {
      throw new Error('Redis URL not configured. Please set KV_URL or REDIS_URL environment variable.');
    }

    // Determine if TLS is needed
    // rediss:// = TLS, redis:// = no TLS
    // Port 6380 is typically TLS, 6379 is typically non-TLS
    const needsTls = redisUrl.startsWith('rediss://') || redisUrl.includes(':6380');

    redis = createClient({
      url: redisUrl,
      socket: {
        tls: needsTls,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error('Too many reconnection attempts');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await redis.connect();
    return redis;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// GET: Retrieve stored activities for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    // Try to get from Redis
    try {
      const client = await getRedisClient();
      const key = getKey(userId);
      const storedJson = await client.get(key);
      
      if (!storedJson) {
        return NextResponse.json({
          activities: null,
          spotify: null,
        });
      }

      const stored: ActivityData = JSON.parse(storedJson);

      // Check if data is expired (older than MAX_AGE)
      const now = Date.now();
      if (now - stored.updatedAt > MAX_AGE) {
        // Data expired, delete it
        await client.del(key);
        return NextResponse.json({
          activities: null,
          spotify: null,
        });
      }

      return NextResponse.json({
        activities: stored.activities,
        spotify: stored.spotify,
        updatedAt: stored.updatedAt,
      });
    } catch (redisError) {
      // If Redis is not configured, return null (graceful degradation)
      console.warn('Redis not configured or error:', redisError);
      return NextResponse.json({
        activities: null,
        spotify: null,
      });
    }
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Store activities for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, activities, spotify } = body;

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    // Validate activities array
    if (activities !== undefined && !Array.isArray(activities)) {
      return NextResponse.json(
        { error: 'Invalid activities format' },
        { status: 400 }
      );
    }

    // Store the data in Redis
    const data: ActivityData = {
      activities: activities || [],
      spotify: spotify || null,
      updatedAt: Date.now(),
    };

    try {
      const client = await getRedisClient();
      const key = getKey(userId);
      
      // Store in Redis with TTL of 90 days (in seconds)
      const ttlSeconds = Math.floor(MAX_AGE / 1000);
      await client.setEx(key, ttlSeconds, JSON.stringify(data));

      return NextResponse.json({
        success: true,
        message: 'Activities stored successfully',
      });
    } catch (redisError) {
      // If Redis is not configured, log warning but don't fail
      console.warn('Redis not configured or error:', redisError);
      return NextResponse.json({
        success: false,
        message: 'Storage not available. Please configure Redis/KV.',
        error: 'REDIS_NOT_CONFIGURED',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Error storing activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

