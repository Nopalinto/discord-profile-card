'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchLanyardData } from '@/lib/api/lanyard';
import { fetchDstnData } from '@/lib/api/dstn';
import { fetchLanternData } from '@/lib/api/lantern';
import type { LanyardResponse } from '@/lib/types/lanyard';
import type { DstnResponse } from '@/lib/types/dstn';
import type { LanternResponse } from '@/lib/types/lantern';
import { isValidDiscordId } from '@/lib/utils/validation';

export interface ProfileData {
  lanyard: LanyardResponse['data'] | null;
  dstn: DstnResponse | null;
  lantern: LanternResponse | null;
  history: any[] | null;
  isVerified: boolean;
  updatedAt: number;
  loading: boolean;
  error: Error | null;
}

export function useDiscordProfile(userId: string | null, autoUpdate = false, updateInterval = 10000) {
  const [profile, setProfile] = useState<ProfileData>({
    lanyard: null,
    dstn: null,
    lantern: null,
    history: null,
    isVerified: true,
    updatedAt: Date.now(),
    loading: true,
    error: null,
  });

  const fetchProfile = useCallback(async (id: string) => {
    if (!isValidDiscordId(id)) {
      setProfile(prev => ({ ...prev, loading: false, error: new Error('Invalid Discord ID') }));
      return;
    }

    setProfile(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [lanyardData, dstnData, lanternData, internalActivities] = await Promise.all([
        fetchLanyardData(id),
        fetchDstnData(id),
        fetchLanternData(id),
        fetch(`/api/activities?userId=${id}`).then(res => res.json()).catch(() => ({ history: [], isVerified: false, updatedAt: Date.now() }))
      ]);

      setProfile({
        lanyard: lanyardData,
        dstn: dstnData,
        lantern: lanternData,
        history: internalActivities?.history || [],
        isVerified: internalActivities?.isVerified ?? false,
        updatedAt: internalActivities?.updatedAt || Date.now(),
        loading: false,
        error: null,
      });
    } catch (error) {
      setProfile(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch profile'),
      }));
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(prev => ({ ...prev, loading: false }));
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let failureCount = 0;

    const poll = async () => {
      // If we're auto-updating or this is the first run
      try {
        await fetchProfile(userId);
        failureCount = 0; // Reset on success

        if (autoUpdate) {
          timeoutId = setTimeout(poll, updateInterval);
        }
      } catch (err) {
        failureCount++;
        // Exponential backoff: 10s -> 20s -> 40s... max 5 min
        const backoffDelay = Math.min(updateInterval * Math.pow(2, failureCount), 300000);
        if (autoUpdate) {
          timeoutId = setTimeout(poll, backoffDelay);
        }
      }
    };

    poll();

    return () => clearTimeout(timeoutId);
  }, [userId, autoUpdate, updateInterval, fetchProfile]);

  return { ...profile, refetch: () => userId && fetchProfile(userId) };
}

