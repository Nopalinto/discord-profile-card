// Lantern API client

import type { LanternResponse } from '@/lib/types/lantern';
import { Cache } from '@/lib/utils/cache';
import { fetchApiData } from './common';

const LANTERN_API = 'https://lantern.rest/api/v1/users';
const cache = new Cache<LanternResponse>();

export async function fetchLanternData(userId: string, bypassCache = false): Promise<LanternResponse | null> {
  const data = await fetchApiData<LanternResponse>(
    `${LANTERN_API}/${userId}`,
    cache,
    userId,
    { bypassCache }
  );

  console.log('DEBUG: fetchLanternData response:', data);

  if (!data) return null;

  // Cache successful result with TTL - shorter TTL for faster updates
  // Only cache if not bypassing (for real-time updates, we want fresh data)
  if (!bypassCache) {
    cache.set(userId, data, 30000); // 30 seconds cache for initial loads
  }
  return data;
}

