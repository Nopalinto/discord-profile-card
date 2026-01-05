import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';
import { isValidDiscordId, sanitizeActivityName } from '@/lib/utils/validation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Streak data structure stored in Redis
interface StreakData {
  [activityName: string]: {
    lastDate: string; // ISO date string (YYYY-MM-DD)
    days: number; // Current streak count
    minutesToday: number; // Minutes played today
  };
}

// Maximum number of different activities to track per user
const MAX_ACTIVITIES_PER_USER = 100;

// Clean up old entries (older than 90 days)
const MAX_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days

// Minimum minutes threshold to count as a day for streak
const STREAK_MINUTES_THRESHOLD = 10;

// Helper function to get Redis key for a user's streaks
function getKey(userId: string): string {
  return `discord-streaks:${userId}`;
}

// Initialize Redis client
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

// GET: Retrieve streaks for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const activityName = searchParams.get('activityName');

    const session = await getServerSession(authOptions);
    if (!session || session.user?.id !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    try {
      const client = await getRedisClient();
      const key = getKey(userId);
      const storedJson = await client.get(key);
      
      if (!storedJson) {
        return NextResponse.json({
          streaks: {},
        });
      }

      const streaks: StreakData = JSON.parse(storedJson);

      // If specific activity requested, return just that
      if (activityName && streaks[activityName]) {
        return NextResponse.json({
          streak: streaks[activityName],
        });
      }

      return NextResponse.json({
        streaks,
      });
    } catch (redisError) {
      console.warn('Redis not configured or error:', redisError);
      return NextResponse.json({
        streaks: {},
      });
    }
  } catch (error) {
    console.error('Error fetching streaks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Update streak for a user's activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, activityName, startTimestamp } = body;

    const session = await getServerSession(authOptions);
    if (!session || session.user?.id !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    const title = sanitizeActivityName(activityName);
    if (!title || title === 'Invalid Activity') {
      return NextResponse.json(
        { error: 'Invalid or missing activityName' },
        { status: 400 }
      );
    }

    try {
      const client = await getRedisClient();
      const key = getKey(userId);
      const storedJson = await client.get(key);
      
      const streaks: StreakData = storedJson ? JSON.parse(storedJson) : {};
      
      // Limit number of activities per user to prevent storage exhaustion
      if (!streaks[title] && Object.keys(streaks).length >= MAX_ACTIVITIES_PER_USER) {
        return NextResponse.json(
          { error: 'Too many activities tracked for this user' },
          { status: 400 }
        );
      }

      const record = streaks[title] || { lastDate: '', days: 0, minutesToday: 0 };
      
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      // Calculate minutes played if start timestamp provided
      if (startTimestamp && typeof startTimestamp === 'number') {
        const mins = Math.floor((Date.now() - startTimestamp) / 60000);
        record.minutesToday = Math.max(record.minutesToday, mins);
      }

      // Update streak if it's a new day
      if (record.lastDate !== today) {
        // If previous day had enough minutes, increment streak, otherwise reset to 1
        if (record.minutesToday >= STREAK_MINUTES_THRESHOLD) {
          record.days = (record.days || 0) + 1;
        } else {
          record.days = 1;
        }
        record.minutesToday = 0;
        record.lastDate = today;
      }

      streaks[title] = record;

      // Store in Redis with TTL of 90 days (in seconds)
      const ttlSeconds = Math.floor(MAX_AGE / 1000);
      await client.setEx(key, ttlSeconds, JSON.stringify(streaks));

      return NextResponse.json({
        success: true,
        streak: record,
        message: 'Streak updated successfully',
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
    console.error('Error updating streak:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

