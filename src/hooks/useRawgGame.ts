'use client';

import { useState, useEffect, useRef } from 'react';
import type { RawgGameDetails } from '@/lib/types/rawg';

interface UseRawgGameResult {
  game: RawgGameDetails | null;
  imageUrl: string | null;
  loading: boolean;
}

/**
 * Hook to fetch RAWG game data for a Discord activity
 * Uses server-side API to keep API key secure
 * Optimized to reduce API requests with debouncing and request deduplication
 */
export function useRawgGame(activityName: string | undefined, userId: string | undefined): UseRawgGameResult {
  const [game, setGame] = useState<RawgGameDetails | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentRequestRef = useRef<string | null>(null);

  // Listen for API key removal/update events to force refresh
  useEffect(() => {
    const handleApiKeyChange = (event: CustomEvent<{ userId: string }>) => {
      // Only process events relevant to the current userId
      if (event.detail?.userId !== userId) {
        return;
      }
      
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Clear cached data when API key is removed or updated
      setGame(null);
      setImageUrl(null);
      setLoading(false);
      currentRequestRef.current = null;
      
      // Trigger refresh by updating refreshTrigger
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('rawg-api-key-removed', handleApiKeyChange as EventListener);
    window.addEventListener('rawg-api-key-updated', handleApiKeyChange as EventListener);
    return () => {
      window.removeEventListener('rawg-api-key-removed', handleApiKeyChange as EventListener);
      window.removeEventListener('rawg-api-key-updated', handleApiKeyChange as EventListener);
    };
  }, [userId]);

  useEffect(() => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!userId || !activityName || activityName.trim() === '') {
      setGame(null);
      setImageUrl(null);
      setLoading(false);
      currentRequestRef.current = null;
      return;
    }

    // List of non-game applications to exclude from RAWG API search
    const nonGameApps = [
      // Code editors
      'visual studio code', 'vscode', 'code',
      'sublime text', 'atom', 'notepad++', 'notepad',
      'vim', 'neovim', 'emacs', 'nano',
      // Browsers
      'chrome', 'firefox', 'edge', 'safari', 'opera', 'brave',
      // Development tools
      'github desktop', 'git', 'docker', 'kubernetes',
      'postman', 'insomnia', 'fiddler',
      // Music/Streaming apps
      'spotify', 'apple music', 'tidal', 'youtube', 'twitch',
      'discord', 'slack', 'teams', 'zoom',
      // Office/Productivity
      'microsoft word', 'excel', 'powerpoint', 'outlook',
      'google docs', 'sheets', 'slides',
      // Other common apps
      'photoshop', 'illustrator', 'premiere', 'after effects',
      'obs', 'streamlabs', 'xsplit'
    ];
    
    const activityNameLower = activityName.toLowerCase();
    const isNonGameApp = nonGameApps.some(app => activityNameLower.includes(app));
    
    if (isNonGameApp) {
      setGame(null);
      setLoading(false);
      currentRequestRef.current = null;
      return;
    }

    // Determine debounce delay: instant if triggered by API key change, normal otherwise
    const debounceDelay = refreshTrigger > 0 ? 0 : 500;

    // Debounce: wait before making request (reduces requests when switching games quickly)
    debounceTimerRef.current = setTimeout(() => {
      // Skip duplicate requests only if we're already loading the exact same game
      // AND refreshTrigger hasn't changed (meaning it's not a forced refresh)
      const shouldSkip = currentRequestRef.current === activityName && refreshTrigger === 0;
      if (shouldSkip) {
        return;
      }

      currentRequestRef.current = activityName;
      setLoading(true);
      
      // Fetch from server-side API (API key is stored server-side, never exposed)
      fetch(`/api/rawg-game?userId=${encodeURIComponent(userId)}&gameName=${encodeURIComponent(activityName)}`)
        .then(res => res.json())
        .then((data: { game: RawgGameDetails | null; imageUrl: string | null }) => {
          // Only update if this is still the current request (user hasn't switched games)
          if (currentRequestRef.current === activityName) {
            setGame(data.game);
            setImageUrl(data.imageUrl);
            setLoading(false);
            // Reset refreshTrigger after a successful fetch
            if (refreshTrigger > 0) {
              setRefreshTrigger(0);
            }
          }
        })
        .catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching RAWG game:', error);
          }
          // Only update if this is still the current request
          if (currentRequestRef.current === activityName) {
            setGame(null);
            setImageUrl(null);
            setLoading(false);
            // Reset refreshTrigger on error too
            if (refreshTrigger > 0) {
              setRefreshTrigger(0);
            }
          }
        });
    }, debounceDelay); // Use dynamic debounce delay

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [activityName, userId, refreshTrigger]);

  return {
    game,
    imageUrl,
    loading,
  };
}


