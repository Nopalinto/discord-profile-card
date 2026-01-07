import { NextRequest, NextResponse } from 'next/server';
import { isValidDiscordId, sanitizeActivityName } from '@/lib/utils/validation';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getRedisClient, RedisKeys } from '@/lib/redis';
import type { StreakData } from '@/lib/types/redis';
import { STREAK_CONFIG, CACHE_CONFIG } from '@/lib/constants';
import { updateStreakRecord } from '@/lib/utils/streaks';

// Helper function to get Redis key for streaks
function getKey(userId: string): string {
  return `discord-streaks:${userId}`;
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
      if (!streaks[title] && Object.keys(streaks).length >= STREAK_CONFIG.MAX_ACTIVITIES_PER_USER) {
        return NextResponse.json(
          { error: 'Too many activities tracked for this user' },
          { status: 400 }
        );
      }

      const record = streaks[title] || { lastDate: '', days: 0, minutesToday: 0 };
      
      // Update streak record using centralized utility
      const { record: updatedRecord } = updateStreakRecord(record, startTimestamp);
      streaks[title] = updatedRecord;

      // Store in Redis with TTL of 90 days (in seconds)
      const ttlSeconds = Math.floor(CACHE_CONFIG.MAX_AGE_MS / 1000);
      await client.setEx(key, ttlSeconds, JSON.stringify(streaks));

      return NextResponse.json({
        success: true,
        streak: updatedRecord,
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

