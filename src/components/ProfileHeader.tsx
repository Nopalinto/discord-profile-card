 'use client';

import React from 'react';
import { Badges } from './Badges';
import { GuildTags } from './GuildTags';
import { StatusIndicator } from './StatusIndicator';
import { sanitizeExternalURL } from '@/lib/utils/validation';
import type { LanyardResponse } from '@/lib/types/lanyard';
import type { BadgeInfo, GuildTag } from '@/lib/types/discord';

interface DisplayNameColorVariants {
  main: string;
  light1: string;
  light2: string;
  dark1: string;
  dark2: string;
}

interface CustomStatus {
  emoji?: string | null;
  text?: string | null;
}

export interface ProfileHeaderProps {
  user: LanyardResponse['data']['discord_user'] | null;
  displayName: string;
  username: string;
  status: string;
  prettyStatusText: string;
  pronouns?: string;
  bioNode?: React.ReactNode;
  lastSeen?: string | null;
  customStatus?: CustomStatus | null;
  badgeList: BadgeInfo[];
  guildTags: GuildTag[];
  bannerUrl: string | null;
  bannerColor?: string | null;
  avatarUrl: string;
  displayNameColorVariants: DisplayNameColorVariants;
  displayNameFontClass: string;
  displayNameEffectClass: string;
  displayNameEffect?: string;
  gradientBackground?: string;
  toonGradientBackground?: string;
  popGradientBackground?: string;
  neonGlowGradientBackground?: string;
  showDisplayName: boolean;
  hideBadges?: boolean;
  hideServerTag?: boolean;
  disableAnimatedAvatarDecoration?: boolean;
  hideLastSeen?: boolean;
}

function ProfileHeaderComponent({
  user,
  displayName,
  username,
  status,
  prettyStatusText,
  pronouns,
  bioNode,
  lastSeen,
  customStatus,
  badgeList,
  guildTags,
  bannerUrl,
  bannerColor,
  avatarUrl,
  displayNameColorVariants,
  displayNameFontClass,
  displayNameEffectClass,
  displayNameEffect,
  gradientBackground,
  toonGradientBackground,
  popGradientBackground,
  neonGlowGradientBackground,
  showDisplayName,
  hideBadges,
  hideServerTag,
  disableAnimatedAvatarDecoration,
  hideLastSeen,
}: ProfileHeaderProps) {
  return (
    <>
      <div
        className={`profile-banner ${bannerUrl ? 'has-banner' : ''}`}
        id="profile-banner"
        style={
          bannerUrl 
            ? { backgroundImage: `url(${sanitizeExternalURL(bannerUrl)})` } 
            : bannerColor 
              ? { backgroundColor: bannerColor } 
              : undefined
        }
      >
        <div className="banner-overlay"></div>
        <div className="status-badge">
          <div className={`status-dot ${status}`} aria-label="status">
            <svg viewBox="0 0 16 16" className="status-mask online">
              <rect width="16" height="16" fill="#43b581" mask="url(#status-online-16)" />
            </svg>
            <svg viewBox="0 0 16 16" className="status-mask idle">
              <rect width="16" height="16" fill="#faa61a" mask="url(#status-idle-16)" />
            </svg>
            <svg viewBox="0 0 16 16" className="status-mask dnd">
              <rect width="16" height="16" fill="#f04747" mask="url(#status-dnd-16)" />
            </svg>
            <svg viewBox="0 0 16 16" className="status-mask offline">
              <rect width="16" height="16" fill="#747f8d" mask="url(#status-offline-16)" />
            </svg>
          </div>
          <span id="status-text-badge">{prettyStatusText}</span>
        </div>
      </div>

      <div className="avatar-info-section">
        <div className="avatar-container">
          <img
            id="profile-avatar"
            className="profile-avatar"
            alt="Avatar"
            src={sanitizeExternalURL(avatarUrl)}
          />
          {user?.avatar_decoration_data?.asset && !disableAnimatedAvatarDecoration && (
            <div id="avatar-decoration" className="avatar-decoration">
              <img
                alt=""
                src={sanitizeExternalURL(`https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png`)}
              />
            </div>
          )}
          <StatusIndicator status={status} />
        </div>

        <div className="profile-info">
          <div className="name-line">
            {showDisplayName && (
              <div
                id="display-name"
                className={`display-name container_dfb989 showEffect_dfb989 animated_dfb989 loop_dfb989 inProfile_dfb989 ${displayNameFontClass} ${displayNameEffect === 'neon' ? 'has-neon-effect' : ''}`}
                style={{
                  '--custom-display-name-styles-main-color': displayNameColorVariants.main,
                  '--custom-display-name-styles-light-1-color': displayNameColorVariants.light1,
                  '--custom-display-name-styles-light-2-color': displayNameColorVariants.light2,
                  '--custom-display-name-styles-dark-1-color': displayNameColorVariants.dark1,
                  '--custom-display-name-styles-dark-2-color': displayNameColorVariants.dark2,
                  '--custom-display-name-styles-wrap': 'wrap',
                  '--custom-display-name-styles-font-opacity': '1',
                  '--white-500': 'rgb(255, 255, 255)',
                  ...(displayNameEffect === 'toon' && toonGradientBackground ? { '--toon-gradient': toonGradientBackground } : {}),
                  ...(displayNameEffect === 'pop' && popGradientBackground ? { '--pop-gradient': popGradientBackground } : {}),
                  ...(displayNameEffect === 'neon' && neonGlowGradientBackground ? { '--neon-glow-gradient': neonGlowGradientBackground } : {}),
                } as React.CSSProperties}
              >
                {displayNameEffect === 'neon' && (
                  <span className={`neonGlow_dfb989 innerContainer_dfb989 ${displayNameFontClass}`} data-username-with-effects={displayName}>
                    {displayName}
                  </span>
                )}
                <span
                  className={`innerContainer_dfb989 ${displayNameEffectClass} ${displayNameFontClass}`}
                  data-username-with-effects={displayName}
                  style={displayNameEffect === 'gradient' && gradientBackground ? {
                    backgroundImage: gradientBackground,
                  } : undefined}
                >
                  {displayName}
                </span>
              </div>
            )}
            <GuildTags tags={guildTags} hidden={hideServerTag} />
          </div>
          <div id="username" className="username">
            @{username}
            {pronouns && ` • ${pronouns}`}
          </div>
          <Badges badges={badgeList} hidden={hideBadges} />

          {bioNode && (
            <div id="bio-section" className="bio-section">
              <div className="bio-content">
                {bioNode}
              </div>
            </div>
          )}

          {lastSeen && !hideLastSeen && (
            <div id="last-seen" className="last-seen">
              <span className="last-seen-label">Last seen: </span>
              <span className="last-seen-time">{lastSeen}</span>
            </div>
          )}

          {customStatus && (
            <div id="custom-status-section" className="custom-status-section">
              <div className="custom-status-content">
                <span id="custom-emoji" className="custom-emoji">{customStatus.emoji}</span>
                <span id="custom-text" className="custom-text">{customStatus.text}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const areEqual = (prev: ProfileHeaderProps, next: ProfileHeaderProps) => (
  prev.displayName === next.displayName &&
  prev.username === next.username &&
  prev.status === next.status &&
  prev.prettyStatusText === next.prettyStatusText &&
  prev.pronouns === next.pronouns &&
  prev.lastSeen === next.lastSeen &&
  prev.customStatus?.emoji === next.customStatus?.emoji &&
  prev.customStatus?.text === next.customStatus?.text &&
  prev.bannerUrl === next.bannerUrl &&
  prev.bannerColor === next.bannerColor &&
  prev.hideBadges === next.hideBadges &&
  prev.hideServerTag === next.hideServerTag &&
  prev.hideLastSeen === next.hideLastSeen &&
  prev.showDisplayName === next.showDisplayName &&
  prev.displayNameFontClass === next.displayNameFontClass &&
  prev.displayNameEffectClass === next.displayNameEffectClass &&
  prev.displayNameEffect === next.displayNameEffect &&
  prev.gradientBackground === next.gradientBackground &&
  prev.toonGradientBackground === next.toonGradientBackground &&
  prev.popGradientBackground === next.popGradientBackground &&
  prev.neonGlowGradientBackground === next.neonGlowGradientBackground &&
  prev.displayNameColorVariants.main === next.displayNameColorVariants.main &&
  prev.displayNameColorVariants.light1 === next.displayNameColorVariants.light1 &&
  prev.displayNameColorVariants.light2 === next.displayNameColorVariants.light2 &&
  prev.displayNameColorVariants.dark1 === next.displayNameColorVariants.dark1 &&
  prev.displayNameColorVariants.dark2 === next.displayNameColorVariants.dark2 &&
  prev.user?.avatar_decoration_data?.asset === next.user?.avatar_decoration_data?.asset &&
  prev.avatarUrl === next.avatarUrl
);

export const ProfileHeader = React.memo(ProfileHeaderComponent, areEqual);

