'use client';

import { useEffect, useState } from 'react';
import type { LanyardActivity } from '@/lib/types/lanyard';
import { sanitizeExternalURL, escapeHtml } from '@/lib/utils/validation';
import { msToHMS } from '@/lib/utils/formatting';
import { useRawgGame } from '@/hooks/useRawgGame';
import { useStreak } from '@/hooks/useStreak';

interface ActivityCardProps {
  activity: LanyardActivity;
  hideTimestamp?: boolean;
  userId?: string;
}

const ICON_VSCODE = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill="#007ACC" d="M243.7 49.7 192 32 76 139.1 125.5 188z"/><path fill="#1F9CF0" d="m192 32-16.5 192 68.2-29.7V49.7z"/><path fill="#0065A9" d="m44.3 105.9 81.2 81.2 21.3-21.3-60-60L44.3 105.9z"/><path fill="#1F9CF0" d="m44.3 150.1 31.3 31.3 61.2-61.2-21.3-21.3-71.2 51.2z"/></svg>`);

function resolveAssetImage(appId: string | undefined, key: string | undefined, externalUrl?: string): string {
  if (key === 'external' && externalUrl) return externalUrl;
  if (!key) return '';
  if (String(key).startsWith('mp:')) return `https://media.discordapp.net/${String(key).slice(3)}`;
  if (appId && /^[0-9]+$/.test(String(appId))) return `https://cdn.discordapp.com/app-assets/${appId}/${key}.png`;
  return '';
}

function placeholder(w: number, h: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='rgba(99,99,102,0.35)'/>
      <stop offset='100%' stop-color='rgba(53,53,55,0.50)'/>
    </linearGradient></defs>
    <rect width='100%' height='100%' rx='10' fill='url(#g)'/>
    <path d='M0 ${h} L${w} 0' stroke='rgba(255,255,255,0.25)' stroke-width='2'/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function activityHeader(type: number): string {
  switch (type) {
    case 0: return 'Playing';
    case 1: return 'Streaming';
    case 2: return 'Listening';
    case 3: return 'Watching';
    case 5: return 'Competing';
    default: return 'Playing';
  }
}

export function ActivityCard({ activity, hideTimestamp = false, userId }: ActivityCardProps) {
  const [elapsed, setElapsed] = useState('');

  // Check if this is a game activity (Playing or Competing)
  const isGameActivity = activity.type === 0 || activity.type === 5;
  
  // Fetch RAWG game data for game activities (API key is stored server-side)
  const { game: rawgGame, imageUrl: rawgImageUrl, loading: rawgLoading } = useRawgGame(
    isGameActivity ? activity.name : undefined,
    userId
  );

  // Fetch and update streak for this activity
  const { streak, updateStreak } = useStreak(userId, activity.name);

  useEffect(() => {
    if (!activity.timestamps?.start || hideTimestamp) return;

    const updateElapsed = () => {
      const started = activity.timestamps?.start ?? Date.now();
      setElapsed(msToHMS(Math.max(0, Date.now() - started)));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activity.timestamps?.start, hideTimestamp]);

  // Update streak when activity starts or changes
  useEffect(() => {
    if (activity.name && activity.timestamps?.start && userId) {
      // Update streak with current activity
      updateStreak(activity.name, activity.timestamps.start);
    }
  }, [activity.name, activity.timestamps?.start, userId, updateStreak]);

  // Use Discord image if available, otherwise fall back to RAWG image
  // RAWG API is ONLY used as a fallback when Discord doesn't provide an image
  const discordLargeUrl = resolveAssetImage(activity.application_id, activity.assets?.large_image, (activity as any).assets?.external_url);
  const largeUrl = discordLargeUrl || rawgImageUrl || placeholder(120, 120);
  
  const smallUrl = resolveAssetImage(activity.application_id, activity.assets?.small_image, (activity as any).assets?.small_external_url) || 
    (String(activity.name).toLowerCase().includes('code') ? ICON_VSCODE : '');

  // Keep original Discord tooltip (no RAWG metadata)
  const bigTip = activity.assets?.large_text || activity.details || activity.state || activity.name || 'Activity';
  const smallTip = activity.assets?.small_text || activity.name || 'App';
  const aid = activity.id || 'primary';
  const hasElapsed = !!activity.timestamps?.start && !hideTimestamp;
  // Show streak even for recent activities (when hideTimestamp is true)
  const showStreak = activity.name && (activity.type === 0 || activity.type === 5) && streak > 0;

  return (
    <article className="discord-activity-card" id={`activity-${aid}`}>
      <header className="activity-card-header">
        <div className="activity-header-text">{activityHeader(activity.type)}</div>
        <div className="activity-header-right">
          <button className="activity-context-menu" aria-label="Options" title="Options">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" fill="currentColor"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
              <circle cx="19" cy="12" r="2" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>
      <div className="activity-card-body">
        <div className="activity-content">
          <div className="activity-image">
            {largeUrl ? (
              <img 
                data-aid={aid}
                alt={escapeHtml(bigTip) || 'Activity image'} 
                src={sanitizeExternalURL(largeUrl)} 
                className="large-image"
              />
            ) : (
              <div className="large-image-placeholder" />
            )}
            {smallUrl && (
              <div className="smallImageContainer_ef9ae7 activity-small-thumbnail" data-tip={escapeHtml(smallTip)}>
                <img 
                  className="contentImage__42bf5 contentImage_ef9ae7" 
                  alt={escapeHtml(smallTip)} 
                  src={sanitizeExternalURL(smallUrl)}
                />
                <span style={{ display: 'none' }}></span>
              </div>
            )}
          </div>
          <div className="activity-details">
            <div className="activity-title">{escapeHtml(activity.name || 'Activity')}</div>
            {activity.details && (
              <div className="activity-artist">{escapeHtml(activity.details)}</div>
            )}
            {activity.state && (
              <div className="activity-artist">{escapeHtml(activity.state)}</div>
            )}
            {(hasElapsed || showStreak) && (
              <div className="elapsed-row flex-wrap justify-center md:justify-start">
                {hasElapsed && (
                  <div className="elapsed-pill">
                    <svg className="clock" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                      <path d="M12 7v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                    <span id={`activity-time-${aid}`}>{elapsed}</span>
                    <span>elapsed</span>
                  </div>
                )}
                {showStreak && (
                  <div className="elapsed-pill" id={`streak-pill-${aid}`}>
                    <svg className="flame" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="m8.294 14-1.767 7.068c-.187.746.736 1.256 1.269.701L19.79 9.27A.75.75 0 0 0 19.25 8h-4.46l1.672-5.013A.75.75 0 0 0 15.75 2h-7a.75.75 0 0 0-.721.544l-3 10.5A.75.75 0 0 0 5.75 14h2.544Z"/>
                    </svg>
                    <span>{streak}x&nbsp;Streak</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

