'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LanyardResponse, LanyardActivity, LanyardSpotify } from '@/lib/types/lanyard';
import type { DstnResponse } from '@/lib/types/dstn';
import type { LanternResponse } from '@/lib/types/lantern';
import {
  extractBadges,
  extractGuildTags,
  getAvatarUrl,
  getDisplayName,
  getUsername,
  getBannerUrl,
  getStatus,
  getCustomStatus,
  formatLastSeenTime,
} from '@/lib/utils/profile';
import { sanitizeExternalURL } from '@/lib/utils/validation';
import { prettyStatus } from '@/lib/utils/formatting';
import type { UrlParams } from '@/lib/utils/url';
import { ActivitySections } from './Activities/ActivitySections';
import { ProfileHeader } from './ProfileHeader';

// Utility function to convert color string to RGB format
function toRgb(color: string): string {
  if (color.startsWith('rgb')) return color;
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return color;
}

// Parse Discord markdown syntax in bio
function parseDiscordMarkdown(text: string): React.ReactNode {
  if (!text) return text;
  
  // Split by line breaks first to handle multiline elements
  const lines = text.split('\n');
  const parsedLines: React.ReactNode[] = [];
  
  lines.forEach((line, lineIndex) => {
    if (line.trim() === '') {
      parsedLines.push(<br key={`br-${lineIndex}`} />);
      return;
    }
    
    // Parse block quotes (must be at start of line)
    if (line.startsWith('>>>')) {
      // Multiline block quote
      const quoteText = line.substring(3).trim();
      parsedLines.push(
        <div key={`blockquote-${lineIndex}`} className="discord-blockquote discord-blockquote-multiline">
          {parseInlineMarkdown(quoteText)}
        </div>
      );
      return;
    } else if (line.startsWith('>')) {
      // Single line block quote
      const quoteText = line.substring(1).trim();
      parsedLines.push(
        <div key={`blockquote-${lineIndex}`} className="discord-blockquote">
          {parseInlineMarkdown(quoteText)}
        </div>
      );
      return;
    }
    
    // Parse code blocks (```language code```)
    const codeBlockMatch = line.match(/^```(\w+)?\n?([\s\S]*?)```$/);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || 'text';
      const code = codeBlockMatch[2];
      parsedLines.push(
        <pre key={`codeblock-${lineIndex}`} className="discord-codeblock">
          <code className={`language-${language}`}>{code}</code>
        </pre>
      );
      return;
    }
    
    // Parse list items
    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const marker = listMatch[2];
      const content = listMatch[3];
      const isOrdered = /^\d+\.$/.test(marker);
      
      parsedLines.push(
        <div key={`list-${lineIndex}`} className={`discord-list-item ${isOrdered ? 'discord-list-ordered' : 'discord-list-unordered'}`} style={{ paddingLeft: `${indent * 20}px` }}>
          {isOrdered ? <span className="discord-list-marker">{marker}</span> : <span className="discord-list-marker">•</span>}
          <span className="discord-list-content">{parseInlineMarkdown(content)}</span>
        </div>
      );
      return;
    }
    
    // Parse regular line with inline markdown
    parsedLines.push(
      <div key={`line-${lineIndex}`} className="discord-bio-line">
        {parseInlineMarkdown(line)}
      </div>
    );
  });
  
  return <>{parsedLines}</>;
}

// Parse inline Discord markdown (bold, italic, underline, strikethrough, code, links, spoilers, timestamps)
function parseInlineMarkdown(text: string): React.ReactNode {
  if (!text) return text;
  
  const parts: (string | React.ReactNode)[] = [];
  let remaining = text;
  let keyCounter = 0;
  
  // Parse in order of priority (most specific first)
  while (remaining.length > 0) {
    let matched = false;
    
    // 1. Discord timestamps: <t:timestamp:t>
    const timestampMatch = remaining.match(/^<t:(\d+):([tTdDfFR])>/);
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1]);
      const format = timestampMatch[2];
      const date = new Date(timestamp * 1000);
      let formatted: string;
      
      switch (format.toLowerCase()) {
        case 't': // Short time (e.g., 9:41 PM)
          formatted = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          break;
        case 'T': // Long time (e.g., 9:41:30 PM)
          formatted = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
          break;
        case 'd': // Short date (e.g., 06/28/2018)
          formatted = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
          break;
        case 'D': // Long date (e.g., June 28, 2018)
          formatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          break;
        case 'f': // Short date/time (e.g., June 28, 2018 9:41 PM)
          formatted = date.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
          break;
        case 'F': // Long date/time (e.g., Thursday, June 28, 2018 9:41 PM)
          formatted = date.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
          break;
        case 'R': // Relative time (e.g., 2 years ago)
          const now = Date.now();
          const diff = now - date.getTime();
          const seconds = Math.floor(diff / 1000);
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          const months = Math.floor(days / 30);
          const years = Math.floor(days / 365);
          
          if (years > 0) formatted = `${years} year${years > 1 ? 's' : ''} ago`;
          else if (months > 0) formatted = `${months} month${months > 1 ? 's' : ''} ago`;
          else if (days > 0) formatted = `${days} day${days > 1 ? 's' : ''} ago`;
          else if (hours > 0) formatted = `${hours} hour${hours > 1 ? 's' : ''} ago`;
          else if (minutes > 0) formatted = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
          else formatted = 'just now';
          break;
        default:
          formatted = date.toLocaleString();
      }
      
      parts.push(
        <span key={`timestamp-${keyCounter++}`} className="discord-timestamp" title={date.toLocaleString()}>
          {formatted}
        </span>
      );
      remaining = remaining.substring(timestampMatch[0].length);
      matched = true;
    }
    
    // 2. Inline code: `code`
    if (!matched) {
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code key={`code-${keyCounter++}`} className="discord-inline-code">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.substring(codeMatch[0].length);
        matched = true;
      }
    }
    
    // 3. Spoilers: ||text||
    if (!matched) {
      const spoilerMatch = remaining.match(/^\|\|([^|]+)\|\|/);
      if (spoilerMatch) {
        parts.push(
          <span key={`spoiler-${keyCounter++}`} className="discord-spoiler">
            {parseInlineMarkdown(spoilerMatch[1])}
          </span>
        );
        remaining = remaining.substring(spoilerMatch[0].length);
        matched = true;
      }
    }
    
    // 4. Links: [text](url)
    if (!matched) {
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkUrl = sanitizeExternalURL(linkMatch[2]);
        parts.push(
          <a
            key={`link-${keyCounter++}`}
            href={linkUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="bio-link"
            onClick={(e) => {
              if (!linkUrl) e.preventDefault();
              e.stopPropagation();
            }}
          >
            {parseInlineMarkdown(linkText)}
          </a>
        );
        remaining = remaining.substring(linkMatch[0].length);
        matched = true;
      }
    }
    
    // 5. Complex formatting combinations (underline + bold italic, etc.)
    // __***text***__
    if (!matched) {
      const underlineBoldItalicMatch = remaining.match(/^__\*\*\*([^_*]+)\*\*\*__/);
      if (underlineBoldItalicMatch) {
        parts.push(
          <span key={`format-${keyCounter++}`} className="discord-underline discord-bold discord-italic">
            {parseInlineMarkdown(underlineBoldItalicMatch[1])}
          </span>
        );
        remaining = remaining.substring(underlineBoldItalicMatch[0].length);
        matched = true;
      }
    }
    
    // __**text**__
    if (!matched) {
      const underlineBoldMatch = remaining.match(/^__\*\*([^_*]+)\*\*__/);
      if (underlineBoldMatch) {
        parts.push(
          <span key={`format-${keyCounter++}`} className="discord-underline discord-bold">
            {parseInlineMarkdown(underlineBoldMatch[1])}
          </span>
        );
        remaining = remaining.substring(underlineBoldMatch[0].length);
        matched = true;
      }
    }
    
    // __*text*__
    if (!matched) {
      const underlineItalicMatch = remaining.match(/^__\*([^_*]+)\*__/);
      if (underlineItalicMatch) {
        parts.push(
          <span key={`format-${keyCounter++}`} className="discord-underline discord-italic">
            {parseInlineMarkdown(underlineItalicMatch[1])}
          </span>
        );
        remaining = remaining.substring(underlineItalicMatch[0].length);
        matched = true;
      }
    }
    
    // 6. Underline: __text__
    if (!matched) {
      const underlineMatch = remaining.match(/^__([^_]+)__/);
      if (underlineMatch) {
        parts.push(
          <span key={`format-${keyCounter++}`} className="discord-underline">
            {parseInlineMarkdown(underlineMatch[1])}
          </span>
        );
        remaining = remaining.substring(underlineMatch[0].length);
        matched = true;
      }
    }
    
    // 7. Bold italic: ***text***
    if (!matched) {
      const boldItalicMatch = remaining.match(/^\*\*\*([^*]+)\*\*\*/);
      if (boldItalicMatch) {
        parts.push(
          <span key={`format-${keyCounter++}`} className="discord-bold discord-italic">
            {parseInlineMarkdown(boldItalicMatch[1])}
          </span>
        );
        remaining = remaining.substring(boldItalicMatch[0].length);
        matched = true;
      }
    }
    
    // 8. Bold: **text**
    if (!matched) {
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(
          <strong key={`format-${keyCounter++}`} className="discord-bold">
            {parseInlineMarkdown(boldMatch[1])}
          </strong>
        );
        remaining = remaining.substring(boldMatch[0].length);
        matched = true;
      }
    }
    
    // 9. Italic: *text* or _text_
    if (!matched) {
      const italicMatch = remaining.match(/^([*_])([^*_\s][^*_]*?)\1(?!\1)/);
      if (italicMatch) {
        parts.push(
          <em key={`format-${keyCounter++}`} className="discord-italic">
            {parseInlineMarkdown(italicMatch[2])}
          </em>
        );
        remaining = remaining.substring(italicMatch[0].length);
        matched = true;
      }
    }
    
    // 10. Strikethrough: ~~text~~
    if (!matched) {
      const strikeMatch = remaining.match(/^~~([^~]+)~~/);
      if (strikeMatch) {
        parts.push(
          <span key={`format-${keyCounter++}`} className="discord-strikethrough">
            {parseInlineMarkdown(strikeMatch[1])}
          </span>
        );
        remaining = remaining.substring(strikeMatch[0].length);
        matched = true;
      }
    }
    
    // 11. URLs (plain URLs not in markdown links)
    if (!matched) {
      const urlMatch = remaining.match(/^(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        parts.push(
          <a
            key={`url-${keyCounter++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bio-link"
            onClick={(e) => e.stopPropagation()}
          >
            {url}
          </a>
        );
        remaining = remaining.substring(url.length);
        matched = true;
      }
    }
    
    // 12. Discord custom emojis: :emoji_name:
    if (!matched) {
      const emojiMatch = remaining.match(/^:([a-zA-Z0-9_]+):/);
      if (emojiMatch) {
        // Discord emoji would need to be fetched from CDN, for now just show the name
        parts.push(
          <span key={`emoji-${keyCounter++}`} className="discord-custom-emoji" title={emojiMatch[1]}>
            :{emojiMatch[1]}:
          </span>
        );
        remaining = remaining.substring(emojiMatch[0].length);
        matched = true;
      }
    }
    
    // If nothing matched, add the first character and continue
    if (!matched) {
      parts.push(remaining[0]);
      remaining = remaining.substring(1);
    }
  }
  
  return <>{parts}</>;
}

interface ProfileCardProps {
  lanyard: LanyardResponse['data'] | null;
  dstn: DstnResponse | null;
  lantern: LanternResponse | null;
  history?: any[] | null;
  params?: UrlParams;
}

export function ProfileCard({ lanyard, dstn, lantern, history, params }: ProfileCardProps) {
  const user = lanyard?.discord_user || null;
  const dstnUser = dstn?.user || null;

  // Store last known activities and spotify when online/idle/dnd
  // Use state instead of refs so component re-renders when server data loads
  const [lastKnownActivities, setLastKnownActivities] = useState<LanyardActivity[] | null>(null);
  const [lastKnownSpotify, setLastKnownSpotify] = useState<LanyardSpotify | null>(null);
  
  // Get user ID for API calls
  const userId = user?.id || dstnUser?.id || null;

  const avatarUrl = useMemo(() => getAvatarUrl(user, dstnUser), [user, dstnUser]);
  const displayName = useMemo(() => getDisplayName(user, dstnUser), [user, dstnUser]);
  const username = useMemo(() => getUsername(user), [user]);
  const status = useMemo(() => getStatus(lanyard), [lanyard]);
  const badges = useMemo(() => extractBadges(lanyard, dstn), [lanyard, dstn]);
  const guildTags = useMemo(() => extractGuildTags(lanyard, dstn), [lanyard, dstn]);
  const customStatus = useMemo(() => getCustomStatus(lanyard), [lanyard]);
  const bannerUrl = useMemo(() => getBannerUrl(lanyard, dstn, params?.bannerUrl), [lanyard, dstn, params?.bannerUrl]);
  const lastSeen = useMemo(() => formatLastSeenTime(lantern), [lantern]);
  
  // Get display name color (from params or accent color from theme)
  const displayNameColorValue = useMemo(() => {
    // Use custom color from params if provided
    if (params?.displayNameColor) {
      // If it's a gradient, return it as-is (will be handled separately)
      if (params.displayNameColor.startsWith('linear-gradient')) {
        return params.displayNameColor;
      }
      // Otherwise, treat as hex color
      return `#${params.displayNameColor}`;
    }
    // Fallback to accent color from theme
    if (dstn?.user_profile?.theme_colors && Array.isArray(dstn.user_profile.theme_colors) && dstn.user_profile.theme_colors.length >= 2) {
      const accentColorHex = dstn.user_profile.theme_colors[1];
      const r = (accentColorHex >> 16) & 255;
      const g = (accentColorHex >> 8) & 255;
      const b = accentColorHex & 255;
      return `rgb(${r}, ${g}, ${b})`;
    }
    return '#ffffff';
  }, [params?.displayNameColor, dstn]);

  // Generate color variants for effects (like Discord does)
  const displayNameColorVariants = useMemo(() => {
    const mainColor = displayNameColorValue;
    
    // If it's a gradient, extract the first color for variants
    let colorToUse = mainColor;
    if (mainColor.startsWith('linear-gradient')) {
      // Extract first color from gradient (e.g., "linear-gradient(135deg, #FF6B9D 0%, ...")
      const match = mainColor.match(/#[0-9A-Fa-f]{6}|rgb\([^)]+\)/);
      if (match) {
        colorToUse = match[0];
      } else {
        // Fallback to default
        colorToUse = '#FF6B9D';
      }
    }
    
    // Convert hex to RGB if needed
    let r = 255, g = 255, b = 255;
    if (colorToUse.startsWith('#')) {
      const hex = colorToUse.slice(1);
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (colorToUse.startsWith('rgb')) {
      const match = colorToUse.match(/\d+/g);
      if (match) {
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
      }
    }
    
    // Generate lighter and darker variants
    const lighten = (amount: number) => {
      return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
    };
    const darken = (amount: number) => {
      return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
    };
    
    return {
      main: colorToUse,
      light1: lighten(40),
      light2: lighten(80),
      dark1: darken(60),
      dark2: darken(120),
    };
  }, [displayNameColorValue]);

  // Map font names to Discord's font classes
  const displayNameFontClass = useMemo(() => {
    const font = params?.displayNameFont || 'gg-sans';
    const fontClassMap: Record<string, string> = {
      'gg-sans': 'dnsFont__89a31',
      'tempo': 'neoCastel__89a31',
      'sakura': 'cherryBomb__89a31',
      'jellybean': 'chicle__89a31',
      'modern': 'museoModerno__89a31',
      'medieval': 'zillaSlab__89a31',
      '8bit': 'pixelify__89a31',
      'vampyre': 'sinistre__89a31',
    };
    return fontClassMap[font] || fontClassMap['gg-sans'];
  }, [params?.displayNameFont]);

  // Get display name effect class
  const displayNameEffectClass = useMemo(() => {
    const effect = params?.displayNameEffect || 'solid';
    return `${effect}_dfb989`;
  }, [params?.displayNameEffect]);

  // Generate gradient background for gradient effect
  const gradientBackground = useMemo(() => {
    if (params?.displayNameEffect !== 'gradient') return undefined;
    // If user selected gradient start and end colors, use them
    if (params?.displayNameGradientStart && params?.displayNameGradientEnd) {
      return `linear-gradient(135deg, #${params.displayNameGradientStart} 0%, #${params.displayNameGradientEnd} 100%)`;
    }
    // If displayNameColor is already a gradient, use it directly
    if (params?.displayNameColor && params.displayNameColor.startsWith('linear-gradient')) {
      return params.displayNameColor;
    }
    // Otherwise, generate gradient from color variants
    return `linear-gradient(135deg, ${displayNameColorVariants.main} 0%, ${displayNameColorVariants.light1} 50%, ${displayNameColorVariants.light2} 100%)`;
  }, [params?.displayNameEffect, params?.displayNameColor, params?.displayNameGradientStart, params?.displayNameGradientEnd, displayNameColorVariants]);

  // Generate complex gradient for toon effect (animated gradient with multiple color stops)
  const toonGradientBackground = useMemo(() => {
    if (params?.displayNameEffect !== 'toon') return undefined;
    // Create a vertical gradient pattern similar to Discord's: white -> light -> main -> light -> main -> white -> light -> main
    // This creates a smooth animated effect when the background-position animates vertically
    // The gradient is 400% height, so when it animates from 0% to 100%, it creates a smooth scrolling effect
    const white = 'rgb(255, 255, 255)';
    const mainRgb = toRgb(displayNameColorVariants.main);
    const light1Rgb = toRgb(displayNameColorVariants.light1);
    const light2Rgb = toRgb(displayNameColorVariants.light2);
    // Vertical gradient (no angle = top to bottom)
    return `linear-gradient(${white} 0px, ${light2Rgb} 8%, ${light1Rgb} 15%, ${mainRgb} 25%, ${light2Rgb} 45%, ${mainRgb} 55%, ${white} 75%, ${light2Rgb} 83%, ${light1Rgb} 90%, ${mainRgb} 100%)`;
  }, [params?.displayNameEffect, displayNameColorVariants]);

  // Generate gradient for pop effect (creates 3D shadow effect)
  const popGradientBackground = useMemo(() => {
    if (params?.displayNameEffect !== 'pop') return undefined;
    // Create a gradient that goes from main color to darker shades for the 3D shadow effect
    // The gradient animates to create the pop/bounce shadow effect
    const mainRgb = toRgb(displayNameColorVariants.main);
    const dark1Rgb = toRgb(displayNameColorVariants.dark1);
    const dark2Rgb = toRgb(displayNameColorVariants.dark2);
    // Gradient for shadow effect: main color -> darker shades
    // This creates the 3D shadow when animated
    return `linear-gradient(${mainRgb} 0%, ${dark1Rgb} 50%, ${dark2Rgb} 100%)`;
  }, [params?.displayNameEffect, displayNameColorVariants]);

  // Generate gradient for neon glow effect
  const neonGlowGradientBackground = useMemo(() => {
    if (params?.displayNameEffect !== 'neon') return undefined;
    // Create a gradient that goes from main color to lighter shades for the glow effect
    const mainRgb = toRgb(displayNameColorVariants.main);
    const light1Rgb = toRgb(displayNameColorVariants.light1);
    const light2Rgb = toRgb(displayNameColorVariants.light2);
    // Gradient for glow effect: main color -> lighter shades
    // This creates the glowing effect when blurred
    return `linear-gradient(${mainRgb} 0%, ${light1Rgb} 50%, ${light2Rgb} 100%)`;
  }, [params?.displayNameEffect, displayNameColorVariants]);

  // Load last known activities and Spotify from server on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !userId) return;
    
    // Fetch stored activities from server
    fetch(`/api/activities?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
          setLastKnownActivities(data.activities);
          
          // Update streaks for loaded activities
          data.activities.forEach((activity: any) => {
            // Only track streaks for game activities (Playing or Competing)
            if ((activity.type === 0 || activity.type === 5) && activity.name && activity.timestamps?.start) {
              fetch('/api/streaks', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId,
                  activityName: activity.name,
                  startTimestamp: activity.timestamps.start,
                }),
              }).catch(error => {
                // Silently fail if API is unavailable
                if (process.env.NODE_ENV === 'development') {
                  console.warn('Failed to update streak:', error);
                }
              });
            }
          });
        }
        if (data.spotify && typeof data.spotify === 'object') {
          setLastKnownSpotify(data.spotify);
        }
      })
      .catch(error => {
        // Silently fail if API is unavailable
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to load last known activities from server:', error);
        }
      });
  }, [userId]);

  // Store last known activities whenever they change (regardless of status)
  // This ensures we always capture the most recent activities, even when user goes offline
  useEffect(() => {
    if (!userId) return;
    
    const activitiesToStore = lanyard?.activities || [];
    const spotifyToStore = lanyard?.spotify || null;
      
    // Only save if we have activities or spotify data
    if (activitiesToStore.length > 0 || spotifyToStore) {
      // Update state immediately
      if (activitiesToStore.length > 0) {
        setLastKnownActivities(activitiesToStore);
        }
      if (spotifyToStore) {
        setLastKnownSpotify(spotifyToStore);
      }
      
      // POST /api/activities removed due to security vulnerability (Unauthenticated Cache Poisoning)
      // We rely on the backend to fetch fresh data from Lanyard directly via the GET endpoint.

      // Update streaks for each activity
      activitiesToStore.forEach((activity) => {
        // Only track streaks for game activities (Playing or Competing)
        if ((activity.type === 0 || activity.type === 5) && activity.name && activity.timestamps?.start) {
          fetch('/api/streaks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              activityName: activity.name,
              startTimestamp: activity.timestamps.start,
            }),
          }).catch(error => {
            // Silently fail if API is unavailable
            if (process.env.NODE_ENV === 'development') {
              console.warn('Failed to update streak:', error);
            }
          });
        }
      });
    }
  }, [lanyard?.activities, lanyard?.spotify, userId]); // Removed 'status' dependency to save regardless of status

  // Get activities (non-listening, non-custom status)
  // Use last known activities when offline, current activities when online
  const activities = useMemo(() => {
    let activitiesToUse: LanyardActivity[] = [];
    
    if (status === 'offline') {
      // When offline, use state (which may have been loaded from server)
      activitiesToUse = lastKnownActivities || lanyard?.activities || [];
    } else {
      // When online, use current activities
      activitiesToUse = lanyard?.activities || [];
    }
    
    if (!activitiesToUse || activitiesToUse.length === 0) return [];
    let filtered = activitiesToUse.filter(a => a.type !== 4 && a.type !== 2);
    // Filter out activities by app ID if hideAppById is set
    if (params?.hideAppId && params.hideAppId.length > 0) {
      filtered = filtered.filter(a => {
        const appId = String(a.application_id || '');
        return !params.hideAppId!.includes(appId);
      });
    }
    return filtered;
  }, [lanyard, params?.hideAppId, status, lastKnownActivities]);

  // Get listening activities
  // Use last known activities when offline, current activities when online
  const listeningActivities = useMemo(() => {
    let activitiesToUse: LanyardActivity[] = [];
    
    if (status === 'offline') {
      // When offline, use state (which may have been loaded from server)
      activitiesToUse = lastKnownActivities || lanyard?.activities || [];
    } else {
      // When online, use current activities
      activitiesToUse = lanyard?.activities || [];
    }
    
    if (!activitiesToUse || activitiesToUse.length === 0) return [];
    let filtered = activitiesToUse.filter(a => a.type === 2);
    // Filter out activities by app ID if hideAppById is set
    if (params?.hideAppId && params.hideAppId.length > 0) {
      filtered = filtered.filter(a => {
        const appId = String(a.application_id || '');
        return !params.hideAppId!.includes(appId);
      });
    }
    return filtered;
  }, [lanyard, params?.hideAppId, status, lastKnownActivities]);

  // Use last known spotify when offline, current spotify when online
  const spotify = useMemo(() => {
    if (status === 'offline') {
      // When offline, use state (which may have been loaded from server)
      return lastKnownSpotify || lanyard?.spotify || null;
    } else {
      // When online, use current Spotify
      return lanyard?.spotify || null;
    }
  }, [status, lanyard?.spotify, lastKnownSpotify]);

  // Apply theme colors if default scheme
  useEffect(() => {
    const profileCard = document.querySelector('.discord-profile-card');
    const outerContainer = document.querySelector('.outer_c0bea0');
    
    // If transparent is enabled, set background to transparent
    if (params?.transparent) {
      if (profileCard) {
        profileCard.setAttribute('style', 'background: transparent !important; backdrop-filter: none; -webkit-backdrop-filter: none;');
      }
      if (outerContainer && outerContainer instanceof HTMLElement) {
        outerContainer.style.background = 'transparent';
        outerContainer.style.border = 'none';
        outerContainer.style.boxShadow = 'none';
      }
      return;
    }
    
    // Reset outer container styles when not transparent
    if (outerContainer && outerContainer instanceof HTMLElement) {
      outerContainer.style.background = '';
      outerContainer.style.border = '';
      outerContainer.style.boxShadow = '';
    }
    
    if (!profileCard) return;

    const colorScheme = params?.colorScheme || 'default';
    
    if (colorScheme === 'default' && dstn?.user_profile?.theme_colors && Array.isArray(dstn.user_profile.theme_colors) && dstn.user_profile.theme_colors.length >= 2) {
      // Apply Discord theme colors
      const color1Hex = dstn.user_profile.theme_colors[0];
      const color2Hex = dstn.user_profile.theme_colors[1];
      
      const r1 = (color1Hex >> 16) & 255;
      const g1 = (color1Hex >> 8) & 255;
      const b1 = color1Hex & 255;
      const r2 = (color2Hex >> 16) & 255;
      const g2 = (color2Hex >> 8) & 255;
      const b2 = color2Hex & 255;
      
      // Convert to HSL (simplified - would need full conversion)
      profileCard.setAttribute('style', `background: linear-gradient(180deg, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 100%)`);
    } else if (colorScheme === 'dark') {
      profileCard.setAttribute('style', 'background: linear-gradient(180deg, #2f3136 0%, #23272a 100%)');
    } else if (colorScheme === 'light') {
      profileCard.setAttribute('style', 'background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)');
    } else if (colorScheme === 'custom' && params?.primaryColor && params?.accentColor) {
      profileCard.setAttribute('style', `background: linear-gradient(135deg, #${params.primaryColor} 0%, #${params.accentColor} 100%)`);
    } else {
      profileCard.removeAttribute('style');
    }
  }, [params?.colorScheme, params?.primaryColor, params?.accentColor, params?.transparent, dstn]);

  // Ensure sections expand properly after render
  useEffect(() => {
    // Force reflow to trigger CSS transitions
    const activitiesSection = document.querySelector('.discord-activities-section');
    const musicSection = document.querySelector('.discord-music-section');
    
    if (activitiesSection && activitiesSection.classList.contains('has-content') && activitiesSection instanceof HTMLElement) {
      // Trigger reflow
      void activitiesSection.offsetHeight;
    }
    
    if (musicSection && musicSection.classList.contains('has-content') && musicSection instanceof HTMLElement) {
      // Trigger reflow
      void musicSection.offsetHeight;
    }
  }, [activities, listeningActivities, spotify, params?.hideActivity, params?.hideSpotify]);

  const pronouns = dstn?.user_profile?.pronouns;
  const bio = dstn?.user_profile?.bio;
  const showDisplayName = !params?.hideDisplayName; // Show display name unless hideDisplayName is true
  const parsedBio = useMemo(() => (bio ? parseDiscordMarkdown(bio) : null), [bio]);
  const prettyStatusText = useMemo(() => prettyStatus(status), [status]);

  // Convert RGB/Hex to HSL for CSS variables (like Discord does)
  const getThemeColors = useMemo(() => {
    let primaryHsl = 'hsla(300, 53%, 45.9%, 1)';
    let secondaryHsl = 'hsla(335, 97.1%, 73.3%, 1)';
    let overlayColor = '#00000099';
    let buttonColor = 'hsla(299, 100%, 25.7%, 1)';
    let modalBgColor = 'hsla(317, 60.8%, 10%, 1)';

    if (params?.colorScheme === 'default' && dstn?.user_profile?.theme_colors && Array.isArray(dstn.user_profile.theme_colors) && dstn.user_profile.theme_colors.length >= 2) {
      // Convert theme colors to HSL
      const primaryHex = dstn.user_profile.theme_colors[0];
      const secondaryHex = dstn.user_profile.theme_colors[1];
      
      const hexToHsl = (hex: number): string => {
        const r = (hex >> 16) & 255;
        const g = (hex >> 8) & 255;
        const b = hex & 255;
        
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        let h = 0, s = 0, l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          
          switch (max) {
            case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
            case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
            case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
          }
        }
        
        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);
        
        return `hsla(${h}, ${s}%, ${l}%, 1)`;
      };
      
      primaryHsl = hexToHsl(primaryHex);
      secondaryHsl = hexToHsl(secondaryHex);
      
      // Generate darker variants for button and modal
      const r2 = (secondaryHex >> 16) & 255;
      const g2 = (secondaryHex >> 8) & 255;
      const b2 = secondaryHex & 255;
      const rNorm2 = r2 / 255;
      const gNorm2 = g2 / 255;
      const bNorm2 = b2 / 255;
      const max2 = Math.max(rNorm2, gNorm2, bNorm2);
      const min2 = Math.min(rNorm2, gNorm2, bNorm2);
      const l2 = (max2 + min2) / 2;
      const s2 = max2 !== min2 ? (l2 > 0.5 ? (max2 - min2) / (2 - max2 - min2) : (max2 - min2) / (max2 + min2)) : 0;
      const h2 = max2 === min2 ? 0 : max2 === rNorm2 ? ((gNorm2 - bNorm2) / (max2 - min2) + (gNorm2 < bNorm2 ? 6 : 0)) / 6 : max2 === gNorm2 ? ((bNorm2 - rNorm2) / (max2 - min2) + 2) / 6 : ((rNorm2 - gNorm2) / (max2 - min2) + 4) / 6;
      
      buttonColor = `hsla(${Math.round(h2 * 360)}, ${Math.round(s2 * 100)}%, ${Math.round(l2 * 20)}%, 1)`;
      modalBgColor = `hsla(${Math.round(h2 * 360)}, ${Math.round(s2 * 100)}%, ${Math.round(l2 * 5)}%, 1)`;
    } else if (params?.colorScheme === 'custom' && params?.primaryColor && params?.accentColor) {
      // Convert custom colors to HSL
      const hexToHsl = (hex: string): string => {
        const hexClean = hex.replace('#', '');
        const r = parseInt(hexClean.slice(0, 2), 16) / 255;
        const g = parseInt(hexClean.slice(2, 4), 16) / 255;
        const b = parseInt(hexClean.slice(4, 6), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        
        return `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, 1)`;
      };
      
      primaryHsl = hexToHsl(params.primaryColor);
      secondaryHsl = hexToHsl(params.accentColor);
    }
    
    return {
      primaryHsl,
      secondaryHsl,
      overlayColor,
      buttonColor,
      modalBgColor,
    };
  }, [params?.colorScheme, params?.primaryColor, params?.accentColor, dstn]);

  return (
    <div
      className="outer_c0bea0 theme-dark images-dark user-profile-popout custom-theme-background custom-user-profile-theme"
      style={{
        '--profile-gradient-primary-color': getThemeColors.primaryHsl,
        '--profile-gradient-secondary-color': getThemeColors.secondaryHsl,
        '--profile-gradient-overlay-color': getThemeColors.overlayColor,
        '--profile-gradient-button-color': getThemeColors.buttonColor,
        '--profile-gradient-modal-background-color': getThemeColors.modalBgColor,
      } as React.CSSProperties}
    >
      <div className="inner_c0bea0">
        <div className="discord-profile-card" style={{ margin: '0 auto' }}>
          <ProfileHeader
            user={user}
            displayName={displayName}
            username={username}
            status={status}
            prettyStatusText={prettyStatus(status)}
            pronouns={pronouns}
            bioNode={parsedBio}
            lastSeen={lastSeen}
            customStatus={customStatus}
            badgeList={badges}
            guildTags={guildTags}
            bannerUrl={bannerUrl}
            avatarUrl={avatarUrl}
            displayNameColorVariants={displayNameColorVariants}
            displayNameFontClass={displayNameFontClass}
            displayNameEffectClass={displayNameEffectClass}
            displayNameEffect={params?.displayNameEffect}
            gradientBackground={gradientBackground}
            toonGradientBackground={toonGradientBackground}
            popGradientBackground={popGradientBackground}
            neonGlowGradientBackground={neonGlowGradientBackground}
            showDisplayName={showDisplayName}
            hideBadges={params?.hideBadges}
            hideServerTag={params?.hideServerTag}
            disableAnimatedAvatarDecoration={params?.disableAnimatedAvatarDecoration}
            hideLastSeen={params?.hideLastSeen}
          />
          <ActivitySections
            activities={activities}
            listeningActivities={listeningActivities}
            spotify={spotify}
            history={history}
            hideActivity={params?.hideActivity}
            hideSpotify={params?.hideSpotify}
            hideActivityTime={params?.hideActivityTime}
            hideRecentActivity={params?.hideRecentActivity}
            status={status}
            userId={userId || undefined}
          />
        </div>
      </div>
    </div>
  );
}

