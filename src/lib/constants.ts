// Shared constants across the application

export const STREAK_CONFIG = {
  MINUTES_THRESHOLD: 10,
  MAX_ACTIVITIES_PER_USER: 100,
} as const;

export const CACHE_CONFIG = {
  MAX_AGE_MS: 90 * 24 * 60 * 60 * 1000, // 90 days
} as const;

