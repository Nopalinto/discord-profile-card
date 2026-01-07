// Redis-related type definitions

import type { LanyardActivity, LanyardSpotify } from './lanyard';

export interface StreakRecord {
  lastDate: string; // ISO date string (YYYY-MM-DD)
  days: number; // Current streak count
  minutesToday: number; // Minutes played today
}

export interface StreakData {
  [activityName: string]: StreakRecord;
}

export interface ActivityData {
  activities: LanyardActivity[];
  spotify: LanyardSpotify | null;
  updatedAt: number;
}

