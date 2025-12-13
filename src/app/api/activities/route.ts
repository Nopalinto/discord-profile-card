import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';
import type { LanyardActivity, LanyardSpotify } from '@/lib/types/lanyard';
import { isValidDiscordId } from '@/lib/utils/validation';
import { fetchLanyardData } from '@/lib/api/lanyard';

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

    if (!userId || !isValidDiscordId(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    const now = Date.now();
    let cachedData: ActivityData | null = null;

    // Try to get from Redis first (for fallback)
    try {
      const client = await getRedisClient();
      const key = getKey(userId);
      const storedJson = await client.get(key);
      
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
            
            return NextResponse.json({
              activities: freshActivities,
              spotify: freshSpotify,
              updatedAt: now,
            });
          } else {
            // Lanyard returned data but no activities (user is offline and Lanyard cleared activities)
            // Check if we have cached data that might be more recent
            // If cache was updated recently (within last 30 minutes), it might have the last known activity
            if (cachedData && cachedData.activities.length > 0) {
              const cacheAge = now - cachedData.updatedAt;
              // Use cached data if it's recent (within 30 minutes) - user might have just gone offline
              if (cacheAge < 30 * 60 * 1000) { // 30 minutes
                return NextResponse.json({
                  activities: cachedData.activities,
                  spotify: cachedData.spotify,
                  updatedAt: cachedData.updatedAt,
                });
              }
              // Cache is old, but we should still update it with current timestamp
              // to indicate we checked, even though there are no current activities
              const emptyData: ActivityData = {
                activities: [],
                spotify: null,
                updatedAt: now,
              };
              const ttlSeconds = Math.floor(MAX_AGE / 1000);
              await client.setEx(key, ttlSeconds, JSON.stringify(emptyData));
            }
            // No activities in fresh data and cache is old or empty, return empty
            return NextResponse.json({
              activities: [],
              spotify: null,
              updatedAt: now,
            });
          }
        } else {
          // Lanyard API failed or returned no data, use cached data if available
          if (cachedData) {
            return NextResponse.json({
              activities: cachedData.activities,
              spotify: cachedData.spotify,
              updatedAt: cachedData.updatedAt,
            });
          }
          return NextResponse.json({
            activities: null,
            spotify: null,
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
          });
        }
        return NextResponse.json({
          activities: null,
          spotify: null,
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
          });
        }
      } catch (lanyardError) {
        console.warn('Failed to fetch from Lanyard:', lanyardError);
      }
      
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

