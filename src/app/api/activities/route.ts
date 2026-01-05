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
const MAX_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days - activities persist for a long time

// Cache staleness threshold - if data is older than this, fetch fresh data from Lanyard
// Note: We now always fetch fresh data, but use this to determine if we should wait for it
const CACHE_STALE_THRESHOLD = 2 * 60 * 1000; // 2 minutes - if cache is very fresh, we can return it immediately while fetching fresh in background

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
    
    // Add user ID if not already tracked
    if (!trackedUsers.includes(userId)) {
      trackedUsers.push(userId);
      // Store for 90 days (same as activity data)
      const ttlSeconds = Math.floor(MAX_AGE / 1000);
      await client.setEx(trackedUsersKey, ttlSeconds, JSON.stringify(trackedUsers));
    }
  } catch (error) {
    // Silently fail - tracking is not critical
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to track user:', error);
    }
  }
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

    // Configure Redis client with proper socket options
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

// GET: Retrieve stored activities for a user
// If cache is stale, fetch fresh data from Lanyard API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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

    const now = Date.now();
    let cachedData: ActivityData | null = null;
    let history: any[] = [];

    // Try to get from Redis first (for fallback)
    try {
      const client = await getRedisClient();
      const key = getKey(userId);
      const storedJson = await client.get(key);
      
      // Fetch history
      const historyKey = getHistoryKey(userId);
      const historyJsonList = await client.lRange(historyKey, 0, 19); // Get last 20 items
      history = historyJsonList.map(item => JSON.parse(item));
      
      if (storedJson) {
        const parsed = JSON.parse(storedJson) as ActivityData;
        
        // Validate parsed data structure
        if (parsed && typeof parsed.updatedAt === 'number') {
          // Check if data is expired (older than MAX_AGE)
          if (now - parsed.updatedAt <= MAX_AGE) {
            cachedData = parsed;
          } else {
            // Data expired, delete it
            await client.del(key);
          }
        }
      }

      // ALWAYS fetch fresh data from Lanyard API first
      // This ensures we get the latest activities even if user was online and no one accessed the website
      try {
        const lanyardData = await fetchLanyardData(userId, true); // bypassCache = true to get fresh data
        
        if (lanyardData) {
          const freshActivities = lanyardData.activities || [];
          const freshSpotify = lanyardData.spotify || null;
          const userStatus = lanyardData.discord_status || 'offline';
          
          // Always prefer fresh data from Lanyard if it has activities
          // This ensures we get the latest activities even if user was online and no one accessed the website
          if (freshActivities.length > 0 || freshSpotify) {
            // We have fresh data with activities, use it and update cache
            const freshData: ActivityData = {
              activities: freshActivities,
              spotify: freshSpotify,
              updatedAt: now,
            };
            
            // Update cache with fresh data
            const ttlSeconds = Math.floor(MAX_AGE / 1000);
            await client.setEx(key, ttlSeconds, JSON.stringify(freshData));
            
            // Track this user for background updates
            await trackUser(userId, client);
            
            return NextResponse.json({
              activities: freshActivities,
              spotify: freshSpotify,
              updatedAt: now,
              history: history
            });
          } else {
            // Lanyard returned data but no activities
            // This could mean:
            // 1. User is offline and Lanyard cleared activities
            // 2. User is online but not playing anything
            // 3. User was recently online but went offline before we could fetch
            
            // If user is currently online/idle/dnd but has no activities, return empty
            // (they're not playing anything right now)
            if (userStatus !== 'offline' && userStatus !== 'invisible') {
              // User is online but not playing anything - return empty and update cache
              const emptyData: ActivityData = {
                activities: [],
                spotify: null,
                updatedAt: now,
              };
              const ttlSeconds = Math.floor(MAX_AGE / 1000);
              await client.setEx(key, ttlSeconds, JSON.stringify(emptyData));
              
              return NextResponse.json({
                activities: [],
                spotify: null,
                updatedAt: now,
                history: history
              });
            }
            
            // User is offline - Lanyard has cleared activities
            // The issue: If user was playing a new game but no one accessed the website,
            // the cache wasn't updated and still has old data
            // Solution: We need to check if Lanyard might still have the activity in its system
            // But since Lanyard returned empty, we should check cache but be smart about it
            
            // Check if we have cached data
            if (cachedData && cachedData.activities.length > 0) {
              const cacheAge = now - cachedData.updatedAt;
              
              // IMPORTANT: The real issue is that cache might have old data (Roblox)
              // if no one accessed the website while user was playing Visual Studio Code
              // 
              // Since Lanyard returned empty (user is offline), we can't get fresh data
              // But we should still show cached data if it exists, as it's better than nothing
              // The frontend will handle showing "Recent activity" label to indicate it's cached
              
              // Use cached data if it's not too old (within 2 hours)
              // This is a compromise: we show cached data even if it might be slightly stale
              // because when user is offline, we can't get fresh data from Lanyard
              // The 2-hour window ensures we don't show very old data (like from days ago)
              if (cacheAge < 2 * 60 * 60 * 1000) { // 2 hours
                return NextResponse.json({
                  activities: cachedData.activities,
                  spotify: cachedData.spotify,
                  updatedAt: cachedData.updatedAt,
                  history: history
                });
              }
              // Cache is older than 2 hours - probably stale, return empty
            }
            
            // No activities in fresh data and cache is old/empty or user is offline
            // Return empty to avoid showing stale data
            return NextResponse.json({
              activities: [],
              spotify: null,
              updatedAt: now,
              history: history
            });
          }
        } else {
          // Lanyard API failed or returned no data, use cached data if available
          if (cachedData) {
            return NextResponse.json({
              activities: cachedData.activities,
              spotify: cachedData.spotify,
              updatedAt: cachedData.updatedAt,
              history: history
            });
          }
          return NextResponse.json({
            activities: null,
            spotify: null,
            history: history
          });
        }
      } catch (lanyardError) {
        // If Lanyard fetch fails, return cached data if available
        console.warn('Failed to fetch fresh data from Lanyard:', lanyardError);
        if (cachedData) {
          return NextResponse.json({
            activities: cachedData.activities,
            spotify: cachedData.spotify,
            updatedAt: cachedData.updatedAt,
            history: history
          });
        }
        return NextResponse.json({
          activities: null,
          spotify: null,
          history: history
        });
      }
    } catch (redisError) {
      // If Redis is not configured, try to fetch from Lanyard directly
      console.warn('Redis not configured or error:', redisError);
      
      try {
        const lanyardData = await fetchLanyardData(userId, true);
        if (lanyardData) {
          return NextResponse.json({
            activities: lanyardData.activities || null,
            spotify: lanyardData.spotify || null,
            updatedAt: now,
            history: [] // Redis failed, so no history
          });
        }
      } catch (lanyardError) {
        console.warn('Failed to fetch from Lanyard:', lanyardError);
      }
      
      return NextResponse.json({
        activities: null,
        spotify: null,
        history: []
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



