import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';
import { isValidDiscordId } from '@/lib/utils/validation';

// Helper function to get Redis key for a user's RAWG API key
function getKey(userId: string): string {
  return `discord-rawg-key:${userId}`;
}

// Initialize Redis client (reuse connection logic from activities route)
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

    const needsTls = redisUrl.startsWith('rediss://') || redisUrl.includes(':6380');
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

// GET: Retrieve stored RAWG API key for a user
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

    try {
      const client = await getRedisClient();
      const key = getKey(userId);
      const apiKey = await client.get(key);
      
      if (!apiKey) {
        return NextResponse.json({
          apiKey: null,
          exists: false,
        });
      }

      // DO NOT return the full API key to the client to prevent theft
      // Only return a masked version to indicate it's configured
      const maskedKey = apiKey.length > 8 
        ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
        : '****';

      return NextResponse.json({
        apiKey: maskedKey,
        exists: true,
      });
    } catch (redisError) {
      console.warn('Redis not configured or error:', redisError);
      return NextResponse.json({
        apiKey: null,
      });
    }
  } catch (error) {
    console.error('Error fetching RAWG API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Store RAWG API key for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, apiKey } = body;

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    // Validate API key format (RAWG keys are typically alphanumeric)
    if (apiKey && typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 400 }
      );
    }

    try {
      const client = await getRedisClient();
      const key = getKey(userId);
      
      if (apiKey && apiKey.trim() !== '') {
        // Store API key with no expiration (user can delete it manually)
        await client.set(key, apiKey.trim());
      } else {
        // Delete if empty
        await client.del(key);
      }

      return NextResponse.json({
        success: true,
        message: 'RAWG API key stored successfully',
      });
    } catch (redisError) {
      console.warn('Redis not configured or error:', redisError);
      return NextResponse.json({
        success: false,
        message: 'Storage not available. Please configure Redis/KV.',
        error: 'REDIS_NOT_CONFIGURED',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Error storing RAWG API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

