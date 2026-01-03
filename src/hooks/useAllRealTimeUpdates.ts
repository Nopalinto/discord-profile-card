'use client';

import { useEffect, useRef } from 'react';
import { fetchLanyardData } from '@/lib/api/lanyard';
import { fetchDstnData } from '@/lib/api/dstn';
import { fetchLanternData } from '@/lib/api/lantern';
import { isValidDiscordId } from '@/lib/utils/validation';
import type { LanyardResponse } from '@/lib/types/lanyard';
import type { DstnResponse } from '@/lib/types/dstn';
import type { LanternResponse } from '@/lib/types/lantern';

export interface AllUpdatesCallback {
  (data: {
    lanyard: LanyardResponse['data'] | null;
    dstn: DstnResponse | null;
    lantern: LanternResponse | null;
    history: any[] | null;
  }): void;
}

export function useAllRealTimeUpdates(
  userId: string | null,
  onUpdate: AllUpdatesCallback,
  interval = 500, // 0.5 seconds for more responsive updates
  enabled = true
) {
  const callbackRef = useRef(onUpdate);
  const lastDataRef = useRef<string>('');

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || !userId || !isValidDiscordId(userId)) {
      return;
    }

    let isActive = true;

    const update = async () => {
      if (!isActive) return;
      
      try {
        // Fetch all APIs in parallel
        // 1. Core APIs
        // 2. Internal Activities API (which also returns history)
        const [lanyardData, dstnData, lanternData, internalActivities] = await Promise.all([
          fetchLanyardData(userId, true),
          fetchDstnData(userId, true),
          fetchLanternData(userId, true),
          fetch(`/api/activities?userId=${userId}`).then(res => res.json()).catch(() => ({ history: [] }))
        ]);

        if (!isActive) return;

        const history = internalActivities?.history || [];

        // Create a hash to detect changes
        let lanyardHash = 'null';
        if (lanyardData) {
          const status = lanyardData.discord_status || '';
          const activities = lanyardData.activities || [];
          const activitiesHash = activities.map(activity => {
            return `activity:${activity.id || ''}:${activity.name || ''}:${activity.state || ''}:${activity.details || ''}:${activity.timestamps?.start || ''}:${activity.timestamps?.end || ''}`;
          }).join('|');
          
          const spotify = lanyardData.spotify;
          const spotifyHash = spotify 
            ? `spotify:${spotify.track_id || ''}:${spotify.song || ''}:${spotify.artist || ''}:${spotify.album || ''}:${spotify.timestamps?.start || ''}:${spotify.timestamps?.end || ''}`
            : 'no-spotify';
          
          lanyardHash = `${status}:${activities.length}:${activitiesHash}:${spotifyHash}`;
        }
        
        const dstnHash = dstnData ? `${dstnData.user_profile?.bio?.substring(0, 50) || ''}-${dstnData.user_profile?.theme_colors?.join(',') || ''}` : 'null';
        const lanternHash = lanternData ? `${lanternData.status}-${lanternData.last_seen_at || ''}` : 'null';
        // Add history length to hash to detect new history items
        const dataHash = `${lanyardHash}|${dstnHash}|${lanternHash}|${history.length}`;

        // Only call callback if data actually changed
        if (dataHash !== lastDataRef.current) {
          lastDataRef.current = dataHash;
          callbackRef.current({
            lanyard: lanyardData,
            dstn: dstnData,
            lantern: lanternData,
            history: history,
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Real-time update error:', error);
        }
      }
    };

    // Initial update immediately
    update();

    // Set up fast polling interval
    const intervalId = setInterval(update, interval);

    // Also update when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        update();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Update on window focus
    const handleFocus = () => {
      if (isActive) {
        update();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isActive = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, interval, enabled]);
}

