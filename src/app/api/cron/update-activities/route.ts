import { NextRequest, NextResponse } from 'next/server';
import { fetchLanyardData } from '@/lib/api/lanyard';
import { isValidDiscordId, sanitizeActivityName } from '@/lib/utils/validation';
import type { LanyardActivity, LanyardSpotify } from '@/lib/types/lanyard';
import { getRedisClient, RedisKeys } from '@/lib/redis';
import type { ActivityData, StreakData } from '@/lib/types/redis';
import { STREAK_CONFIG, CACHE_CONFIG } from '@/lib/constants';
import { updateStreakRecord } from '@/lib/utils/streaks';

// Fetch and update activities for a single user
async function updateUserActivities(userId: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    
    // Fetch fresh data from Lanyard
    const lanyardData = await fetchLanyardData(userId, true);
    
    if (lanyardData) {
      const activities = lanyardData.activities || [];
      const spotify = lanyardData.spotify || null;
      
      // Update Activity Cache
      if (activities.length > 0 || spotify) {
        const data: ActivityData = {
          activities,
          spotify,
          updatedAt: Date.now(),
        };
        
        const key = RedisKeys.activities(userId);
        const ttlSeconds = Math.floor(CACHE_CONFIG.MAX_AGE_MS / 1000);
        await client.setEx(key, ttlSeconds, JSON.stringify(data));
      }

      // Update Streaks
      if (activities.length > 0) {
        const streakKey = RedisKeys.streaks(userId);
        const storedStreaksJson = await client.get(streakKey);
        const streaks: StreakData = storedStreaksJson ? JSON.parse(storedStreaksJson) : {};
        let streaksUpdated = false;

        for (const activity of activities) {
          // Only track streaks for game activities (Playing or Competing)
          if ((activity.type === 0 || activity.type === 5) && activity.name && activity.timestamps?.start) {
             const title = sanitizeActivityName(activity.name);
             if (!title || title === 'Invalid Activity') continue;

             // Check limit
             if (!streaks[title] && Object.keys(streaks).length >= STREAK_CONFIG.MAX_ACTIVITIES_PER_USER) continue;

             const record = streaks[title] || { lastDate: '', days: 0, minutesToday: 0 };
             
             // Update streak record using centralized utility
             const startTimestamp = activity.timestamps.start;
             const { record: updatedRecord, updated } = updateStreakRecord(
               record,
               startTimestamp && typeof startTimestamp === 'number' ? startTimestamp : undefined
             );
             
             if (updated) {
               streaksUpdated = true;
             }
             streaks[title] = updatedRecord;
          }
        }

        if (streaksUpdated) {
           const ttlSeconds = Math.floor(CACHE_CONFIG.MAX_AGE_MS / 1000);
           await client.setEx(streakKey, ttlSeconds, JSON.stringify(streaks));
        }
      }
        
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Failed to update activities for user ${userId}:`, error);
    return false;
  }
}

// GET: Cron job endpoint to update activities for all tracked users
// This is called by Vercel Cron Jobs once per day (Hobby plan limitation)
// Note: On Hobby plan, cron jobs can only run once per day and timing is not guaranteed
// The main solution is that /api/activities GET endpoint always fetches fresh data
// This cron job serves as a backup to update activities daily
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (optional security check)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await getRedisClient();
    const trackedUsersKey = RedisKeys.trackedUsers();
    
    // Get list of tracked user IDs
    const trackedUsersJson = await client.get(trackedUsersKey);
    const trackedUsers: string[] = trackedUsersJson ? JSON.parse(trackedUsersJson) : [];
    
    if (trackedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tracked users to update',
        updated: 0,
      });
    }

    // Update activities for all tracked users in parallel (with concurrency limit)
    const CONCURRENCY_LIMIT = 5; // Process 5 users at a time to avoid rate limits
    const results: { userId: string; success: boolean }[] = [];
    
    for (let i = 0; i < trackedUsers.length; i += CONCURRENCY_LIMIT) {
      const batch = trackedUsers.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map(async (userId) => {
          if (!isValidDiscordId(userId)) {
            return { userId, success: false };
          }
          const success = await updateUserActivities(userId);
          return { userId, success };
        })
      );
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + CONCURRENCY_LIMIT < trackedUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Updated activities for ${successCount} out of ${trackedUsers.length} users`,
      updated: successCount,
      total: trackedUsers.length,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

