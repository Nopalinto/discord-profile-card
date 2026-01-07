// Streak calculation utilities

import type { StreakRecord } from '@/lib/types/redis';
import { STREAK_CONFIG } from '@/lib/constants';

/**
 * Calculate minutes played from a start timestamp
 */
export function calculateMinutesPlayed(startTimestamp: number): number {
  return Math.floor((Date.now() - startTimestamp) / 60000);
}

/**
 * Check if streak should be incremented based on previous day's minutes
 */
export function shouldIncrementStreak(minutesToday: number): boolean {
  return minutesToday >= STREAK_CONFIG.MINUTES_THRESHOLD;
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Update a streak record with new activity data
 * @param record - Existing streak record or new empty record
 * @param startTimestamp - Activity start timestamp (optional)
 * @returns Updated record and whether it was modified
 */
export function updateStreakRecord(
  record: StreakRecord,
  startTimestamp?: number
): { record: StreakRecord; updated: boolean } {
  const today = getTodayDateString();
  let updated = false;

  // Calculate minutes played if start timestamp provided
  if (startTimestamp && typeof startTimestamp === 'number') {
    const mins = calculateMinutesPlayed(startTimestamp);
    const newMinutesToday = Math.max(record.minutesToday, mins);
    if (newMinutesToday !== record.minutesToday) {
      record.minutesToday = newMinutesToday;
      updated = true;
    }
  }

  // Update streak if it's a new day
  if (record.lastDate !== today) {
    // If previous day had enough minutes, increment streak, otherwise reset to 1
    if (shouldIncrementStreak(record.minutesToday)) {
      record.days = (record.days || 0) + 1;
    } else {
      record.days = 1;
    }
    record.minutesToday = 0; // Reset for new day
    record.lastDate = today;
    updated = true;
  }

  return { record, updated };
}

