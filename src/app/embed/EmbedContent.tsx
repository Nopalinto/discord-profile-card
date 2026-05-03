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
const CARD_DESIGN_WIDTH = 380;

export function EmbedContent() {
  const searchParams = useSearchParams();
  const urlParams = useUrlParams();
  const userId = urlParams.id || searchParams.get('id') || DEFAULT_USER_ID;
  const isCentered = searchParams.get('center') === 'true' || searchParams.get('preview') === 'true';

  // RAWG API key is now stored server-side and accessed via userId
  // No need to pass it to ProfileCard - it will fetch from server automatically
  const containerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(CARD_DESIGN_WIDTH);
  const [profileData, setProfileData] = useState<{
    lanyard: LanyardResponse['data'] | null;
    dstn: DstnResponse | null;
    lantern: LanternResponse | null;
    history: any[] | null;
    isVerified: boolean;
    updatedAt: number;
  }>({
    lanyard: null,
    dstn: null,
    lantern: null,
    history: null,
    isVerified: true, // Default to true until fetched
    updatedAt: Date.now(),
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
        isVerified: data.isVerified ?? false,
        updatedAt: data.updatedAt || Date.now(),
      });
    },
    2000, // 2 seconds for more responsive updates
    true
  );

  // Track loading state based on whether we have any data
  const loading = !profileData.lanyard && !profileData.dstn && !profileData.lantern;
  const cardScale = Math.min(1, Math.max(0.72, (viewportWidth - 16) / CARD_DESIGN_WIDTH));

  const sendHeight = useCallback(() => {
    if (typeof window === 'undefined') return;
    const cardHeight = profileRef.current?.getBoundingClientRect().height ?? 0;
    const bodyHeight = containerRef.current?.getBoundingClientRect().height ?? 0;
    const height = Math.max(cardHeight, bodyHeight, document.body.getBoundingClientRect().height);
    if (!height) return;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'discord-profile-embed-height', height }, window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewportWidth = () => {
      setViewportWidth(Math.max(0, window.innerWidth));
    };

    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
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
  }, [profileData, cardScale, sendHeight]);

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
    document.documentElement.classList.add('is-embed');
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.setProperty('background', 'transparent', 'important');
    document.body.style.setProperty('background-color', 'transparent', 'important');
    document.body.style.overflow = 'visible';
    document.documentElement.style.setProperty('background', 'transparent', 'important');
    document.documentElement.style.setProperty('background-color', 'transparent', 'important');
    document.documentElement.style.overflow = 'visible';

    return () => {
      document.body.classList.remove('is-embed');
      document.documentElement.classList.remove('is-embed');
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.background = '';
      document.body.style.backgroundColor = '';
      document.body.style.overflow = '';
      document.documentElement.style.background = '';
      document.documentElement.style.backgroundColor = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <>
      <SvgMasks />
      <BadgeTooltip />
      <div className={`${styles.embedBody} ${isCentered ? styles.centered : ''}`} ref={containerRef}>
        <div
          className={styles.embedContainer}
          style={{ width: `${CARD_DESIGN_WIDTH * cardScale}px` }}
        >
          <div
            className={styles.profileWrapper}
            ref={profileRef}
            style={{
              width: `${CARD_DESIGN_WIDTH}px`,
              transform: `scale(${cardScale})`,
              transformOrigin: 'top left',
            }}
          >
            <ProfileCard
              lanyard={profileData.lanyard}
              dstn={profileData.dstn}
              lantern={profileData.lantern}
              history={profileData.history}
              params={urlParams}
              isVerified={profileData.isVerified}
              updatedAt={profileData.updatedAt}
            />
          </div>
        </div>
      </div>
    </>
  );
}

