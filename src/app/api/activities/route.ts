import { NextRequest, NextResponse } from 'next/server';
import type { createClient } from 'redis';
import { isValidDiscordId } from '@/lib/utils/validation';
import { fetchLanyardData } from '@/lib/api/lanyard';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getRedisClient, RedisKeys } from '@/lib/redis';
import type { ActivityData } from '@/lib/types/redis';
import { CACHE_CONFIG } from '@/lib/constants';

// Track a user ID for background updates
async function trackUser(userId: string, client: ReturnType<typeof createClient>): Promise<void> {
  try {
    const trackedUsersKey = RedisKeys.trackedUsers();
    // Use Redis Set for atomic uniqueness
    await client.sAdd(trackedUsersKey, userId);
    // Refresh TTL
    const ttlSeconds = Math.floor(CACHE_CONFIG.MAX_AGE_MS / 1000);
    await client.expire(trackedUsersKey, ttlSeconds);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to track user:', error);
    }
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

    // Proceed with Redis connection for everyone (Read-only for public, Write for owner)
    const now = Date.now();
    try {
      const client = await getRedisClient();

      const key = RedisKeys.activities(userId);
      const storedJson = await client.get(key);
      const historyKey = RedisKeys.history(userId);
      // Public users can see history too
      const historyJsonList = await client.lRange(historyKey, 0, 19);
      const history = historyJsonList.map(item => JSON.parse(item));

      let cachedData: ActivityData | null = null;
      if (storedJson) {
        const parsed = JSON.parse(storedJson) as ActivityData;
        if (parsed && now - parsed.updatedAt <= CACHE_CONFIG.MAX_AGE_MS) {
          cachedData = parsed;
        }
      }

      // IF NOT OWNER: Return cached data only
      if (!isOwner) {
        if (cachedData) {
          return NextResponse.json({
            activities: cachedData.activities,
            spotify: cachedData.spotify,
            history,
            isVerified: false,
            updatedAt: cachedData.updatedAt
          });
        }
        return NextResponse.json({
          activities: [],
          spotify: null,
          history, // Return history even if current activity is empty
          isVerified: false,
          updatedAt: now
        });
      }

      // IF OWNER: Fetch fresh data and update cache (with throttling)
      try {
        const lastFetchKey = `discord-last-fetch:${userId}`;
        const lastFetch = await client.get(lastFetchKey);

        // Thrift check: only fetch if > 3 seconds since last fetch
        if (lastFetch && now - parseInt(lastFetch) < 3000) {
          if (cachedData) {
            return NextResponse.json({ ...cachedData, history, isVerified: true });
          }
          // If no cache but throttled, we must fetch or return empty used cached
        }

        const lanyardData = await fetchLanyardData(userId, true);
        await client.setEx(lastFetchKey, 10, String(now)); // Set throttle key

        if (lanyardData) {
          const freshActivities = lanyardData.activities || [];
          const freshSpotify = lanyardData.spotify || null;
          const userStatus = lanyardData.discord_status || 'offline';

          if (freshActivities.length > 0 || freshSpotify) {
            const freshData: ActivityData = { activities: freshActivities, spotify: freshSpotify, updatedAt: now };
            await client.setEx(key, Math.floor(CACHE_CONFIG.MAX_AGE_MS / 1000), JSON.stringify(freshData));
            await trackUser(userId, client);
            return NextResponse.json({ activities: freshActivities, spotify: freshSpotify, history, isVerified: true, updatedAt: now });
          } else {
            // Online but no activities
            if (userStatus !== 'offline' && userStatus !== 'invisible') {
              const emptyData = { activities: [], spotify: null, updatedAt: now };
              await client.setEx(key, Math.floor(CACHE_CONFIG.MAX_AGE_MS / 1000), JSON.stringify(emptyData));
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