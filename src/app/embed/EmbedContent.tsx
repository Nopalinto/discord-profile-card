'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProfileCard } from '@/components/ProfileCard';
import { SvgMasks } from '@/components/SvgMasks';
import { BadgeTooltip } from '@/components/BadgeTooltip';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useAllRealTimeUpdates } from '@/hooks/useAllRealTimeUpdates';
import { isValidDiscordId } from '@/lib/utils/validation';
import type { LanyardResponse } from '@/lib/types/lanyard';
import type { DstnResponse } from '@/lib/types/dstn';
import type { LanternResponse } from '@/lib/types/lantern';
import styles from './page.module.css';

const DEFAULT_USER_ID = '915480322328649758';

export function EmbedContent() {
  const searchParams = useSearchParams();
  const urlParams = useUrlParams();
  const userId = urlParams.id || searchParams.get('id') || DEFAULT_USER_ID;
  
  // Get RAWG API key from localStorage (not URL for security)
  // Use state to listen to localStorage changes so it updates automatically
  const [rawgApiKey, setRawgApiKey] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rawgApiKey') || undefined;
    }
    return undefined;
  });

  // Listen to localStorage changes for rawgApiKey
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'rawgApiKey') {
        setRawgApiKey(e.newValue || undefined);
      }
    };

    // Listen to storage events (for cross-tab/window updates)
    window.addEventListener('storage', handleStorageChange);

    // Also poll localStorage periodically to catch same-tab updates
    // (storage events only fire for changes from other tabs/windows)
    const pollInterval = setInterval(() => {
      const currentKey = localStorage.getItem('rawgApiKey') || undefined;
      setRawgApiKey(prev => {
        // Only update if it actually changed
        if (prev !== currentKey) {
          return currentKey;
        }
        return prev;
      });
    }, 500); // Check every 500ms

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);
  
  // Update urlParams to include rawgApiKey from localStorage
  const urlParamsWithRawg = useMemo(() => ({
    ...urlParams,
    rawgApiKey: rawgApiKey,
  }), [urlParams, rawgApiKey]);
  const containerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [profileData, setProfileData] = useState<{
    lanyard: LanyardResponse['data'] | null;
    dstn: DstnResponse | null;
    lantern: LanternResponse | null;
  }>({
    lanyard: null,
    dstn: null,
    lantern: null,
  });

  // Use only useAllRealTimeUpdates to avoid duplicate API calls on initial load
  // It will fetch immediately on mount, so we don't need useDiscordProfile
  useAllRealTimeUpdates(
    isValidDiscordId(userId) ? userId : null,
    (data) => {
      setProfileData({
        lanyard: data.lanyard,
        dstn: data.dstn,
        lantern: data.lantern,
      });
    },
    2000, // 2 seconds for more responsive updates
    true
  );

  // Track loading state based on whether we have any data
  const loading = !profileData.lanyard && !profileData.dstn && !profileData.lantern;

  const sendHeight = useCallback(() => {
    if (typeof window === 'undefined') return;
    const cardHeight = profileRef.current?.scrollHeight ?? 0;
    const bodyHeight = containerRef.current?.scrollHeight ?? 0;
    const height = Math.max(cardHeight, bodyHeight, document.body.scrollHeight);
    if (!height) return;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'discord-profile-embed-height', height }, window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sendHeight();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => sendHeight()) : null;
    if (observer) {
      if (containerRef.current) observer.observe(containerRef.current);
      if (profileRef.current) observer.observe(profileRef.current);
    }
    window.addEventListener('resize', sendHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', sendHeight);
    };
  }, [profileData, sendHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleRequest = (event: MessageEvent) => {
      const { type } = event.data || {};
      if (type !== 'discord-profile-request-height') return;
      if (event.origin !== window.location.origin) return;
      sendHeight();
    };
    window.addEventListener('message', handleRequest);
    return () => window.removeEventListener('message', handleRequest);
  }, [sendHeight]);

  // Override body styles for embed page
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'visible';
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.overflow = 'visible';
    
    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.background = '';
      document.body.style.overflow = '';
      document.documentElement.style.background = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <>
      <SvgMasks />
      <BadgeTooltip />
      <div className={styles.embedBody} ref={containerRef}>
        <div className={styles.embedContainer}>
          <div className={styles.profileWrapper} ref={profileRef}>
            <ProfileCard
            lanyard={profileData.lanyard}
            dstn={profileData.dstn}
            lantern={profileData.lantern}
            params={urlParamsWithRawg}
          />
          </div>
        </div>
      </div>
    </>
  );
}

