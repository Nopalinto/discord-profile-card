import { useState, useEffect, useCallback } from 'react';

interface StreakRecord {
  lastDate: string;
  days: number;
  minutesToday: number;
}

interface UseStreakResult {
  streak: number; // Current streak days
  loading: boolean;
  updateStreak: (activityName: string, startTimestamp?: number) => Promise<void>;
}

export function useStreak(
  userId: string | null | undefined,
  activityName: string | undefined
): UseStreakResult {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch streak for the activity
  useEffect(() => {
    if (!userId || !activityName) {
      setStreak(0);
      setLoading(false);
      return;
    }

    const fetchStreak = async () => {
      try {
        const response = await fetch(
          `/api/streaks?userId=${userId}&activityName=${encodeURIComponent(activityName)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.streak) {
            setStreak(data.streak.days || 0);
          } else {
            setStreak(0);
          }
        } else {
          setStreak(0);
        }
      } catch (error) {
        console.warn('Failed to fetch streak:', error);
        setStreak(0);
      } finally {
        setLoading(false);
      }
    };

    fetchStreak();
  }, [userId, activityName]);

  // Update streak function
  const updateStreak = useCallback(async (activityName: string, startTimestamp?: number) => {
    if (!userId || !activityName) return;

    try {
      const response = await fetch('/api/streaks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          activityName,
          startTimestamp,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.streak) {
          setStreak(data.streak.days || 0);
        }
      }
    } catch (error) {
      console.warn('Failed to update streak:', error);
    }
  }, [userId]);

  return {
    streak: Math.max(1, streak), // Minimum streak of 1
    loading,
    updateStreak,
  };
}

