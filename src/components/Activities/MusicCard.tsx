'use client';

import { useEffect, useState } from 'react';
import type { LanyardSpotify, LanyardActivity } from '@/lib/types/lanyard';
import { sanitizeExternalURL, escapeHtml } from '@/lib/utils/validation';
import { resolveAssetImage } from '@/lib/utils/profile';
import { msToMMSS } from '@/lib/utils/formatting';

interface MusicCardProps {
  spotify?: LanyardSpotify | null;
  activity?: LanyardActivity;
  type?: 'spotify' | 'apple' | 'tidal';
  hideTimestamp?: boolean;
}

const ICON_SPOTIFY = 'https://media.discordapp.net/external/SBL-oQIuwzsSwlKo6e2_hIFvUrQolyZmCjxmbMVinn4/https/live.musicpresence.app/v3/icons/spotify/discord-small-image.f4d35e7aa231.png';
const ICON_APPLE = 'https://www.pngarts.com/files/8/Apple-Music-Logo-PNG-Photo.png';
const ICON_TIDAL = 'https://media.discordapp.net/external/2jxHB9nItvOmWpcwXFv-wjFM_aChrDpu86tCHAZo9Cg/https/live.musicpresence.app/v3/icons/tidal/discord-small-image.1b03069cc4c3.png';

export function MusicCard({ spotify, activity, type = 'spotify', hideTimestamp = false }: MusicCardProps) {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState('');
  const [total, setTotal] = useState('');

  let title = '';
  let artist = '';
  let album = '';
  let art = '';
  let start: number | null = null;
  let end: number | null = null;

  if (spotify) {
    title = spotify.song || '';
    artist = spotify.artist || '';
    album = spotify.album || '';
    art = spotify.album_art_url || '';
    start = spotify.timestamps?.start ?? null;
    end = spotify.timestamps?.end ?? null;
  } else if (activity) {
    title = activity.details || activity.name || (type === 'apple' ? 'Apple Music' : type === 'tidal' ? 'TIDAL' : 'Spotify');
    artist = activity.state || '';
    album = activity.assets?.large_text || '';
    art = resolveAssetImage(activity.application_id, activity.assets?.large_image) || '';
    start = activity.timestamps?.start ?? null;
    end = activity.timestamps?.end ?? null;
  }

  useEffect(() => {
    if (!start || hideTimestamp) return;

    const updateProgress = () => {
      if (typeof document !== 'undefined' && document.hidden) return;

      const now = Date.now();
      if (start && end) {
        const totalMs = Math.max(1, end - start);
        const pct = Math.max(0, Math.min(100, ((now - start) / totalMs) * 100));
        setProgress(pct);
        setElapsed(msToMMSS(now - start));
        setTotal(msToMMSS(totalMs));
      } else if (start) {
        setElapsed(msToMMSS(now - start));
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000);

    return () => clearInterval(interval);
  }, [start, end, hideTimestamp]);

  const icon = type === 'apple' ? ICON_APPLE : type === 'tidal' ? ICON_TIDAL : ICON_SPOTIFY;
  const serviceName = type === 'apple' ? 'Apple Music' : type === 'tidal' ? 'TIDAL' : 'Spotify';
  const serviceText = type === 'apple' ? 'Listening to Apple Music' : type === 'tidal' ? 'Listening to TIDAL' : 'Listening on Spotify';

  return (
    <article className="discord-activity-card discord-music-card">
      <header className="activity-card-header">
        <div className="activity-header-text">
          {serviceText} <img className="header-icon" alt="" src={sanitizeExternalURL(icon)} />
        </div>
        <div className="activity-header-right">
          <button className="activity-context-menu" aria-label="Options" title="Options">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="19" cy="12" r="2" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>
      <div className="activity-card-body">
        <div className="activity-content">
          <div className="activity-image">
            <img
              alt={escapeHtml(title || serviceName) || 'Album art'}
              src={sanitizeExternalURL(art) || sanitizeExternalURL(icon)}
              data-tip={escapeHtml(title || serviceName)}
            />
            <div className="smallImageContainer_ef9ae7 activity-small-thumbnail" data-tip={serviceName}>
              <img className="contentImage__42bf5 contentImage_ef9ae7" alt={serviceName} src={sanitizeExternalURL(icon)} />
              <span style={{ display: 'none' }}></span>
            </div>
          </div>
          <div className="activity-details">
            <div className="activity-title">{escapeHtml(title)}</div>
            {artist && <div className="activity-artist">{escapeHtml(artist)}</div>}
            {album && <div className="activity-artist">{escapeHtml(album)}</div>}
            {!hideTimestamp && start && end && (
              <div className="activity-progress-container">
                <div className="activity-progress-time">{elapsed}</div>
                <div className="activity-progress-bar">
                  <div
                    className={`activity-progress-fill ${type}`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="activity-progress-time">{total}</div>
              </div>
            )}
            {!hideTimestamp && start && !end && (
              <div className="elapsed-row">
                <div className="elapsed-pill">
                  <svg className="clock" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"></circle>
                    <path d="M12 7v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                  <span>{elapsed} elapsed</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

