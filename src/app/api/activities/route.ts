import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';
import type { LanyardActivity, LanyardSpotify } from '@/lib/types/lanyard';
import { isValidDiscordId } from '@/lib/utils/validation';
import { fetchLanyardData } from '@/lib/api/lanyard';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Activity data structure stored in Redis
interface ActivityData {
  activities: LanyardActivity[];
  spotify: LanyardSpotify | null;
  updatedAt: number;
}

// Clean up old entries (older than 90 days)
const MAX_AGE = 90 * 24 * 60 * 60 * 1000;

// Helper function to get Redis key for a user
function getKey(userId: string): string {
  return `discord-activities:${userId}`;
}

// Helper function to get Redis key for activity history
function getHistoryKey(userId: string): string {
  return `discord-history:${userId}`;
}

// Helper function to get Redis key for tracked users list
function getTrackedUsersKey(): string {
  return 'discord-activities:tracked-users';
}

// Track a user ID for background updates
async function trackUser(userId: string, client: ReturnType<typeof createClient>): Promise<void> {
  try {
    const trackedUsersKey = getTrackedUsersKey();
    const trackedUsersJson = await client.get(trackedUsersKey);
    const trackedUsers: string[] = trackedUsersJson ? JSON.parse(trackedUsersJson) : [];
    
    if (!trackedUsers.includes(userId)) {
      trackedUsers.push(userId);
      const ttlSeconds = Math.floor(MAX_AGE / 1000);
      await client.setEx(trackedUsersKey, ttlSeconds, JSON.stringify(trackedUsers));
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to track user:', error);
    }
  }
}

// Initialize Redis client
let redis: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (redis && redis.isOpen) return redis;

  try {
    const redisUrl = process.env.KV_URL || process.env.REDIS_URL;
    if (!redisUrl) throw new Error('Redis URL not configured');

    const needsTls = redisUrl.startsWith('rediss://') || redisUrl.includes(':6380');
    const reconnectStrategy = (retries: number) => Math.min(retries * 100, 3000);

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

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 60;

async function checkRateLimit(ip: string, client: any): Promise<boolean> {
  try {
    const key = `rate-limit:${ip}`;
    const current = await client.incr(key);
    if (current === 1) await client.expire(key, RATE_LIMIT_WINDOW);
    return current > RATE_LIMIT_MAX;
  } catch (error) {
    return false;
  }
}

// GET: Retrieve stored activities for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    // AUTHENTICATION CHECK
    const session = await getServerSession(authOptions);
    // @ts-ignore - session.user.id is added in authOptions
    const isOwner = session?.user?.id === userId;

    // IF NOT OWNER: Do not record anything, do not fetch lanyard server-side
    if (!isOwner) {
      return NextResponse.json({
        activities: [],
        spotify: null,
        history: [],
        isVerified: false,
        updatedAt: Date.now()
      });
    }

    // IF OWNER: Proceed with recording and full feature set
    const now = Date.now();
    try {
      const client = await getRedisClient();
      
      // Rate Limit
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      if (ip !== 'unknown' && await checkRateLimit(ip, client)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }

      const key = getKey(userId);
      const storedJson = await client.get(key);
      const historyKey = getHistoryKey(userId);
      const historyJsonList = await client.lRange(historyKey, 0, 19);
      const history = historyJsonList.map(item => JSON.parse(item));

      let cachedData: ActivityData | null = null;
      if (storedJson) {
        const parsed = JSON.parse(storedJson) as ActivityData;
        if (parsed && now - parsed.updatedAt <= MAX_AGE) {
          cachedData = parsed;
        }
      }

      // Fetch fresh data for owner
      try {
        const lanyardData = await fetchLanyardData(userId, true);
        if (lanyardData) {
          const freshActivities = lanyardData.activities || [];
          const freshSpotify = lanyardData.spotify || null;
          const userStatus = lanyardData.discord_status || 'offline';

          if (freshActivities.length > 0 || freshSpotify) {
            const freshData: ActivityData = { activities: freshActivities, spotify: freshSpotify, updatedAt: now };
            await client.setEx(key, Math.floor(MAX_AGE / 1000), JSON.stringify(freshData));
            await trackUser(userId, client);
            return NextResponse.json({ activities: freshActivities, spotify: freshSpotify, history, isVerified: true, updatedAt: now });
          } else {
            // Online but no activities
            if (userStatus !== 'offline' && userStatus !== 'invisible') {
              const emptyData = { activities: [], spotify: null, updatedAt: now };
              await client.setEx(key, Math.floor(MAX_AGE / 1000), JSON.stringify(emptyData));
              return NextResponse.json({ activities: [], spotify: null, history, isVerified: true, updatedAt: now });
            }
            // Offline - fallback to cache
            if (cachedData && cachedData.activities.length > 0 && now - cachedData.updatedAt < 2 * 60 * 60 * 1000) {
              return NextResponse.json({ activities: cachedData.activities, spotify: cachedData.spotify, history, isVerified: true, updatedAt: cachedData.updatedAt });
            }
            return NextResponse.json({ activities: [], spotify: null, history, isVerified: true, updatedAt: now });
          }
        }
      } catch (lanyardError) {
        if (cachedData) return NextResponse.json({ ...cachedData, history, isVerified: true });
      }
      
      return NextResponse.json({ activities: null, spotify: null, history, isVerified: true, updatedAt: now });

    } catch (redisError) {
      console.warn('Redis error:', redisError);
      return NextResponse.json({ activities: null, spotify: null, history: [], isVerified: true, updatedAt: now });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}