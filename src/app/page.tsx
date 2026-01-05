'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserIdInput } from '@/components/Generator/UserIdInput';
import { RawgApiKeyInput } from '@/components/Generator/RawgApiKeyInput';
import { DisplayOptions } from '@/components/Generator/DisplayOptions';
import { AppearanceSettings } from '@/components/Generator/AppearanceSettings';
import { ImageOptions } from '@/components/Generator/ImageOptions';
import { UrlGenerator } from '@/components/Generator/UrlGenerator';
import { DisplayNameStyle } from '@/components/Generator/DisplayNameStyle';
import { SvgMasks } from '@/components/SvgMasks';
import { BadgeTooltip } from '@/components/BadgeTooltip';
import { Hero } from '@/components/Hero';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { SettingsAccordion } from '@/components/Generator/SettingsAccordion';
import { ToastContainer } from '@/components/Toast';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useDiscordProfile } from '@/hooks/useDiscordProfile';
import { parseUrlParams } from '@/lib/utils/url';
import type { UrlParams } from '@/lib/utils/url';
import { isValidDiscordId } from '@/lib/utils/validation';

const DEFAULT_USER_ID = '915480322328649758';

function HomePageContent() {
  const searchParams = useSearchParams();
  
  // Parse URL params once (from incoming URL)
  const parsedUrlParams = useMemo(() => parseUrlParams(searchParams), [searchParams]);
  
  const [userId, setUserId] = useState(() => {
    return parsedUrlParams.id || DEFAULT_USER_ID;
  });
  
  // Store RAWG API key on server (associated with userId)
  const [rawgApiKey, setRawgApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`rawg-api-key-${userId}`) || '';
    }
    return '';
  });
  
  // Load RAWG API key from localStorage when userId changes
  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      const savedKey = localStorage.getItem(`rawg-api-key-${userId}`);
      if (savedKey) {
        setRawgApiKey(savedKey);
      }
    }
  }, [userId]);

  // Save API key to server and localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined' || !userId || !isValidDiscordId(userId)) {
      return;
    }

    // Debounce saves to avoid too many requests
    const timeoutId = setTimeout(() => {
      // Save to localStorage
      if (rawgApiKey) {
        localStorage.setItem(`rawg-api-key-${userId}`, rawgApiKey);
      } else {
        localStorage.removeItem(`rawg-api-key-${userId}`);
      }

      // Save to server (for embeds)
      fetch('/api/rawg-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          apiKey: rawgApiKey,
        }),
      }).catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to save RAWG API key to server:', error);
        }
      });
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [rawgApiKey, userId]);
  
  // Initialize display options from URL params
  const [displayOptions, setDisplayOptions] = useState(() => ({
    disableAnimatedAvatarDecoration: parsedUrlParams.disableAnimatedAvatarDecoration ?? false,
    hideServerTag: parsedUrlParams.hideServerTag ?? false,
    hideSpotify: parsedUrlParams.hideSpotify ?? false,
    hideDisplayName: parsedUrlParams.hideDisplayName ?? false, // Default to false (show display name)
    hideActivityTime: parsedUrlParams.hideActivityTime ?? false,
    hideBadges: parsedUrlParams.hideBadges ?? false,
    hideActivity: parsedUrlParams.hideActivity ?? false,
    hideRecentActivity: parsedUrlParams.hideRecentActivity ?? false,
    hideLastSeen: parsedUrlParams.hideLastSeen ?? false,
  }));
  
  // Sync display options when URL params change (but only if they actually changed)
  useEffect(() => {
    setDisplayOptions(prev => {
      const newOptions = {
        disableAnimatedAvatarDecoration: parsedUrlParams.disableAnimatedAvatarDecoration ?? false,
        hideServerTag: parsedUrlParams.hideServerTag ?? false,
        hideSpotify: parsedUrlParams.hideSpotify ?? false,
        hideDisplayName: parsedUrlParams.hideDisplayName ?? false,
        hideActivityTime: parsedUrlParams.hideActivityTime ?? false,
        hideBadges: parsedUrlParams.hideBadges ?? false,
        hideActivity: parsedUrlParams.hideActivity ?? false,
        hideRecentActivity: parsedUrlParams.hideRecentActivity ?? false,
        hideLastSeen: parsedUrlParams.hideLastSeen ?? false,
      };
      // Only update if something actually changed (shallow comparison)
      const hasChanged = Object.keys(newOptions).some(
        key => prev[key as keyof typeof prev] !== newOptions[key as keyof typeof newOptions]
      );
      if (hasChanged) {
        return newOptions;
      }
      return prev;
    });
  }, [parsedUrlParams]);
  
  const [colorScheme, setColorScheme] = useState<'default' | 'dark' | 'light' | 'custom'>(() => {
    return parsedUrlParams.colorScheme || 'default';
  });
  const [primaryColor, setPrimaryColor] = useState(() => {
    return parsedUrlParams.primaryColor ? `#${parsedUrlParams.primaryColor}` : '#8180ff';
  });
  const [accentColor, setAccentColor] = useState(() => {
    return parsedUrlParams.accentColor ? `#${parsedUrlParams.accentColor}` : '#fe80c0';
  });
  const [bannerUrl, setBannerUrl] = useState(() => parsedUrlParams.bannerUrl || '');
  const [imageWidth, setImageWidth] = useState(512);
  const [displayNameFont, setDisplayNameFont] = useState(() => parsedUrlParams.displayNameFont || 'gg-sans');
  const [displayNameEffect, setDisplayNameEffect] = useState(() => parsedUrlParams.displayNameEffect || 'solid');
  const [displayNameColor, setDisplayNameColor] = useState(() => {
    if (parsedUrlParams.displayNameColor) {
      return parsedUrlParams.displayNameColor.startsWith('#') 
        ? parsedUrlParams.displayNameColor 
        : `#${parsedUrlParams.displayNameColor}`;
    }
    return '#FF6B9D';
  });
  const [displayNameGradientStart, setDisplayNameGradientStart] = useState(() => {
    return parsedUrlParams.displayNameGradientStart ? `#${parsedUrlParams.displayNameGradientStart}` : '#FF6B9D';
  });
  const [displayNameGradientEnd, setDisplayNameGradientEnd] = useState(() => {
    return parsedUrlParams.displayNameGradientEnd ? `#${parsedUrlParams.displayNameGradientEnd}` : '#FFB3D9';
  });
  const [iframeHeight, setIframeHeight] = useState(600);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasSetColorFromApi, setHasSetColorFromApi] = useState(false);

  const { lanyard, dstn, lantern, loading } = useDiscordProfile(
    isValidDiscordId(userId) ? userId : null,
    false
  );

  // Set initial color from user's Discord theme color when API data loads
  useEffect(() => {
    if (!loading && dstn?.user_profile?.theme_colors && !hasSetColorFromApi) {
      const themeColors = dstn.user_profile.theme_colors;
      if (Array.isArray(themeColors) && themeColors.length >= 2) {
        // Convert accent color (index 1) from hex number to hex string
        const accentColorHex = themeColors[1];
        const r = (accentColorHex >> 16) & 255;
        const g = (accentColorHex >> 8) & 255;
        const b = accentColorHex & 255;
        const hexString = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
        
        // Set the color if it hasn't been manually changed
        setDisplayNameColor(hexString);
        setDisplayNameGradientStart(hexString);
        
        // Generate a lighter variant for gradient end
        const lightR = Math.min(255, r + 50);
        const lightG = Math.min(255, g + 50);
        const lightB = Math.min(255, b + 50);
        const lightHexString = `#${lightR.toString(16).padStart(2, '0')}${lightG.toString(16).padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`.toUpperCase();
        setDisplayNameGradientEnd(lightHexString);
        
        setHasSetColorFromApi(true);
      }
    }
  }, [dstn, loading, hasSetColorFromApi]);

  // Reset the flag when userId changes
  useEffect(() => {
    setHasSetColorFromApi(false);
  }, [userId]);

  const requestHeight = useCallback(() => {
    if (typeof window === 'undefined') return;
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;
    iframeWindow.postMessage({ type: 'discord-profile-request-height' }, window.location.origin);
  }, []);

  useLayoutEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source && iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      const { type, height } = event.data || {};
      if (type !== 'discord-profile-embed-height') return;
      const parsed = Number(height);
      if (!Number.isFinite(parsed)) return;
      setIframeHeight(Math.max(520, Math.round(parsed)));
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const urlParams: UrlParams = useMemo(() => ({
    id: userId,
    disableAnimatedAvatarDecoration: displayOptions.disableAnimatedAvatarDecoration,
    hideServerTag: displayOptions.hideServerTag,
    hideSpotify: displayOptions.hideSpotify,
    hideDisplayName: displayOptions.hideDisplayName,
    hideActivityTime: displayOptions.hideActivityTime,
    hideBadges: displayOptions.hideBadges,
    hideActivity: displayOptions.hideActivity,
    hideRecentActivity: displayOptions.hideRecentActivity,
    hideLastSeen: displayOptions.hideLastSeen,
    // Don't include rawgApiKey in URL params for security
    // It's stored server-side and accessed via userId
    colorScheme,
    primaryColor: colorScheme === 'custom' ? primaryColor.replace('#', '') : undefined,
    accentColor: colorScheme === 'custom' ? accentColor.replace('#', '') : undefined,
    bannerUrl: bannerUrl || undefined,
    displayNameFont,
    displayNameEffect,
    displayNameColor: displayNameEffect === 'gradient' 
      ? undefined 
      : (displayNameColor.startsWith('linear-gradient') ? displayNameColor : displayNameColor.replace('#', '')),
    displayNameGradientStart: displayNameEffect === 'gradient' ? displayNameGradientStart.replace('#', '') : undefined,
    displayNameGradientEnd: displayNameEffect === 'gradient' ? displayNameGradientEnd.replace('#', '') : undefined,
  }), [userId, displayOptions, colorScheme, primaryColor, accentColor, bannerUrl, displayNameFont, displayNameEffect, displayNameColor, displayNameGradientStart, displayNameGradientEnd]);

  const previewUrl = useMemo(() => {
    if (!isValidDiscordId(userId)) return '';
    const params = new URLSearchParams();
    Object.entries(urlParams).forEach(([key, value]) => {
      if (value !== undefined && value !== false && value !== '') {
        if (typeof value === 'boolean') {
          params.set(key, value ? '1' : '0');
        } else {
          params.set(key, String(value));
        }
      }
    });
    return typeof window !== 'undefined' ? `${window.location.origin}/embed?${params.toString()}` : '';
  }, [userId, urlParams]);

  useEffect(() => {
    requestHeight();
  }, [previewUrl, requestHeight]);

  const handleDisplayOptionChange = (key: string, value: boolean) => {
    setDisplayOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleAppearanceChange = (key: string, value: string) => {
    if (key === 'colorScheme') {
      setColorScheme(value as typeof colorScheme);
    } else if (key === 'primaryColor') {
      setPrimaryColor(value);
    } else if (key === 'accentColor') {
      setAccentColor(value);
    }
  };

  const handleImageOptionChange = (key: string, value: string | number) => {
    if (key === 'bannerUrl') {
      setBannerUrl(String(value));
    } else if (key === 'imageWidth') {
      setImageWidth(Number(value));
    }
  };

  const handleDisplayNameStyleChange = (key: string, value: string) => {
    if (key === 'displayNameFont') {
      setDisplayNameFont(value);
    } else if (key === 'displayNameEffect') {
      setDisplayNameEffect(value);
    } else if (key === 'displayNameColor') {
      setDisplayNameColor(value);
    } else if (key === 'displayNameGradientStart') {
      setDisplayNameGradientStart(value);
    } else if (key === 'displayNameGradientEnd') {
      setDisplayNameGradientEnd(value);
    }
  };

  const effectiveIframeHeight = Math.max(520, iframeHeight);
  const previewRef = useScrollReveal({ threshold: 0.1, triggerOnce: true });
  const settingsRef = useScrollReveal({ threshold: 0.1, triggerOnce: true });

  const scrollToPreview = () => {
    const previewSection = document.getElementById('preview-section');
    if (previewSection) {
      previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <SvgMasks />
      <BadgeTooltip />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#5865F2] focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2 focus:ring-offset-[#09090B]"
      >
        Skip to main content
      </a>
      <Hero onGetStarted={scrollToPreview} />
      <main id="main-content" className="min-h-screen w-full bg-[#09090B] py-10 px-4">
        <div className="mx-auto max-w-[1280px]">
          <div id="preview-section" className="grid gap-6 md:grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <section 
              ref={previewRef.ref as React.RefObject<HTMLElement>}
              className={`rounded-[32px] border border-white/5 bg-gradient-to-b from-[#050505] to-[#0d0d0f] p-4 md:p-6 shadow-[0_30px_45px_rgba(0,0,0,0.55)] transition-all duration-1000 ${
                previewRef.isVisible 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">Live Preview</p>
                  <h1 className="text-2xl font-semibold text-white">Discord Profile</h1>
                </div>
              </div>
              <div className="mt-4 md:mt-6 rounded-3xl border border-white/5 bg-[#0d0e13]/70 p-3 md:p-6">
                <div className="min-h-[400px] md:min-h-[520px] w-full rounded-2xl border border-white/5 bg-zinc-900/50 p-3 md:p-6">
                  {!isValidDiscordId(userId) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-sm text-zinc-400">
                      <div className="mb-3 text-zinc-500">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                          <path d="M2 17l10 5 10-5"></path>
                          <path d="M2 12l10 5 10-5"></path>
                        </svg>
                      </div>
                      <p>Enter your Discord ID to preview your Discord Profile</p>
                    </div>
                  ) : loading ? (
                    <LoadingSkeleton />
                  ) : (
                    <div className="h-full w-full">
                    <iframe
                      onLoad={requestHeight}
                      ref={iframeRef}
                      key={previewUrl}
                      src={previewUrl}
                      frameBorder="0"
                      scrolling="no"
                      className="w-full border-0"
                      style={{
                        minHeight: '520px',
                        height: `${effectiveIframeHeight}px`,
                        background: 'transparent',
                      }}
                    />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Credits Section - Compact */}
              <div className="mt-3 rounded-xl border border-white/5 bg-gradient-to-br from-[#0d0e13]/60 to-[#0a0a0f]/80 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Credits & Inspiration</h3>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <a 
                    href="https://lanyard.cnrad.dev/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all duration-200"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-md bg-gradient-to-br from-[#5865F2]/20 to-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-white group-hover:text-[#5865F2] transition-colors">Lanyard</span>
                        <svg className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight line-clamp-1">Banner preview</p>
                    </div>
                  </a>
                  
                  <a 
                    href="https://github.com/Phineas/lanyard" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all duration-200"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-md bg-gradient-to-br from-[#5865F2]/20 to-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-white group-hover:text-[#5865F2] transition-colors">Phineas/lanyard</span>
                        <svg className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight line-clamp-1">Presence API</p>
                    </div>
                  </a>
                  
                  <a 
                    href="https://gist.github.com/dustinrouillard/04be36180ed80db144a4857408478854" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all duration-200"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-md bg-gradient-to-br from-[#9c84ef]/20 to-[#9c84ef]/10 border border-[#9c84ef]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#9c84ef]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-white group-hover:text-[#9c84ef] transition-colors">dustinrouillard</span>
                        <svg className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight line-clamp-1">Formatting examples</p>
                    </div>
                  </a>
                  
                  <a 
                    href="https://dsc-readme.tsuni.dev/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all duration-200"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-md bg-gradient-to-br from-[#ff6b9d]/20 to-[#ff6b9d]/10 border border-[#ff6b9d]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#ff6b9d]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-white group-hover:text-[#ff6b9d] transition-colors">dsc-readme</span>
                        <svg className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight line-clamp-1">Layout cues</p>
                    </div>
                  </a>
                  
                  <a 
                    href="https://github.com/discordplace/lantern" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all duration-200"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-md bg-gradient-to-br from-[#00d9ff]/20 to-[#00d9ff]/10 border border-[#00d9ff]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#00d9ff]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-white group-hover:text-[#00d9ff] transition-colors">discordplace/lantern</span>
                        <svg className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight line-clamp-1">Last-seen & status</p>
                    </div>
                  </a>
                </div>
              </div>
              
              {/* Discord Server Section */}
              <div className="mt-3 rounded-xl border border-white/5 bg-gradient-to-br from-[#5865F2]/10 to-[#5865F2]/5 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg className="w-3.5 h-3.5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.016a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.65a.061.061 0 0 0-.031-.03zM8.02 15.33a1.125 1.125 0 0 1-1.06-1.048 1.106 1.106 0 0 1 1.048-1.06 1.124 1.124 0 0 1 1.06 1.047 1.1 1.1 0 0 1-1.048 1.06zm7.975 0a1.125 1.125 0 0 1-1.06-1.048 1.106 1.106 0 0 1 1.048-1.06 1.124 1.124 0 0 1 1.06 1.047 1.1 1.1 0 0 1-1.048 1.06z"/>
                  </svg>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5865F2]">Join Discord Servers</h3>
                </div>
                <p className="text-[9px] text-zinc-400 mb-2 leading-tight">Join these Discord servers to ensure APIs can fetch your profile data:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <a 
                    href="https://discord.gg/N4hGYDvWBy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 p-2 rounded-lg border border-[#5865F2]/20 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 hover:border-[#5865F2]/30 transition-all duration-200"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-md bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.016a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.65a.061.061 0 0 0-.031-.03zM8.02 15.33a1.125 1.125 0 0 1-1.06-1.048 1.106 1.106 0 0 1 1.048-1.06 1.124 1.124 0 0 1 1.06 1.047 1.1 1.1 0 0 1-1.048 1.06zm7.975 0a1.125 1.125 0 0 1-1.06-1.048 1.106 1.106 0 0 1 1.048-1.06 1.124 1.124 0 0 1 1.06 1.047 1.1 1.1 0 0 1-1.048 1.06z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-white group-hover:text-[#5865F2] transition-colors">Lanyard</span>
                        <svg className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight line-clamp-1">Presence API server</p>
                    </div>
                  </a>
                  
                  <a 
                    href="https://discord.com/invite/ZayKFnDtRT" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 p-2 rounded-lg border border-[#00d9ff]/20 bg-[#00d9ff]/10 hover:bg-[#00d9ff]/20 hover:border-[#00d9ff]/30 transition-all duration-200"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-md bg-[#00d9ff]/20 border border-[#00d9ff]/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#00d9ff]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.016a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.65a.061.061 0 0 0-.031-.03zM8.02 15.33a1.125 1.125 0 0 1-1.06-1.048 1.106 1.106 0 0 1 1.048-1.06 1.124 1.124 0 0 1 1.06 1.047 1.1 1.1 0 0 1-1.048 1.06zm7.975 0a1.125 1.125 0 0 1-1.06-1.048 1.106 1.106 0 0 1 1.048-1.06 1.124 1.124 0 0 1 1.06 1.047 1.1 1.1 0 0 1-1.048 1.06z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-white group-hover:text-[#00d9ff] transition-colors">Lantern</span>
                        <svg className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight line-clamp-1">Last-seen API server</p>
                    </div>
                  </a>
                </div>
              </div>
            </section>

            <aside 
              ref={settingsRef.ref as React.RefObject<HTMLElement>}
              className={`rounded-[32px] border border-white/5 bg-[#020203]/80 p-4 md:p-6 transition-all duration-1000 delay-200 ${
                settingsRef.isVisible 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-8'
              }`}
              aria-label="Settings panel"
            >
              <header className="border-b border-white/5 pb-3 md:pb-4 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                <h2 className="sr-only">Discord Profile Settings</h2>
                <span aria-hidden="true">Discord Profile</span>
              </header>
              <div className="mt-4 md:mt-6">
                <SettingsAccordion
                  sections={[
                    {
                      id: 'user-id',
                      title: 'User ID',
                      description: 'Enter your Discord User ID',
                      defaultOpen: true,
                      content: <UserIdInput value={userId} onChange={setUserId} />,
                    },
                    {
                      id: 'rawg-api-key',
                      title: 'RAWG API Key',
                      description: 'Improve game activity images',
                      defaultOpen: false,
                      content: <RawgApiKeyInput value={rawgApiKey} onChange={setRawgApiKey} userId={userId} />,
                    },
                    {
                      id: 'quick-customize',
                      title: 'Quick Customize',
                      description: 'Most common settings',
                      defaultOpen: true,
                      content: (
                        <>
                          <AppearanceSettings
                            colorScheme={colorScheme}
                            primaryColor={primaryColor}
                            accentColor={accentColor}
                            onChange={handleAppearanceChange}
                          />
                          <div className="mt-3">
                            <DisplayNameStyle
                              font={displayNameFont}
                              effect={displayNameEffect}
                              color={displayNameColor}
                              gradientStart={displayNameGradientStart}
                              gradientEnd={displayNameGradientEnd}
                              onChange={handleDisplayNameStyleChange}
                            />
                          </div>
                        </>
                      ),
                    },
                    {
                      id: 'advanced-options',
                      title: 'Advanced Options',
                      description: 'Display toggles and customization',
                      defaultOpen: false,
                      content: (
                        <>
                          <DisplayOptions options={displayOptions} onChange={handleDisplayOptionChange} />
                          <div className="mt-3">
                            <ImageOptions
                              bannerUrl={bannerUrl}
                              imageWidth={imageWidth}
                              onChange={handleImageOptionChange}
                            />
                          </div>
                        </>
                      ),
                    },
                    {
                      id: 'export-share',
                      title: 'Export & Share',
                      description: 'Copy embed code',
                      defaultOpen: isValidDiscordId(userId) && !loading,
                      content: isValidDiscordId(userId) && !loading ? (
                        <UrlGenerator userId={userId} params={urlParams} />
                      ) : (
                        <p className="text-xs text-zinc-500 text-center py-4">
                          Enter a valid Discord ID to generate embed code
                        </p>
                      ),
                    },
                  ]}
                />
              </div>
            </aside>
          </div>
        </div>
      </main>
      <ToastContainer />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-[#09090B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#5865F2]"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
