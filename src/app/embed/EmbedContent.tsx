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
  const isCentered = searchParams.get('center') === 'true' || searchParams.get('preview') === 'true';
  
  // RAWG API key is now stored server-side and accessed via userId
  // No need to pass it to ProfileCard - it will fetch from server automatically
  const containerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [profileData, setProfileData] = useState<{
    lanyard: LanyardResponse['data'] | null;
    dstn: DstnResponse | null;
    lantern: LanternResponse | null;
    history: any[] | null;
  }>({
    lanyard: null,
    dstn: null,
    lantern: null,
    history: null,
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
        history: data.history,
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
    document.body.classList.add('is-embed');
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'visible';
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.overflow = 'visible';
    
    return () => {
      document.body.classList.remove('is-embed');
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
      <div className={`${styles.embedBody} ${isCentered ? styles.centered : ''}`} ref={containerRef}>
        <div className={styles.embedContainer}>
          <div className={styles.profileWrapper} ref={profileRef}>
            <ProfileCard
            lanyard={profileData.lanyard}
            dstn={profileData.dstn}
            lantern={profileData.lantern}
            history={profileData.history}
            params={urlParams}
          />
          </div>
        </div>
      </div>
    </>
  );
}

