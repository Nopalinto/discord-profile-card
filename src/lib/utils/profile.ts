// Profile data processing utilities

import type { LanyardResponse } from '@/lib/types/lanyard';
import type { DstnResponse } from '@/lib/types/dstn';
import type { LanternResponse } from '@/lib/types/lantern';
import type { BadgeInfo, GuildTag } from '@/lib/types/discord';
import { normalizeStatus } from './formatting';
import { sanitizeExternalURL } from './validation';

export function resolveAssetImage(appId: string | undefined, key: string | undefined, externalUrl?: string): string {
  if (key === 'external' && externalUrl) return externalUrl;
  if (!key) return '';
  if (String(key).startsWith('mp:')) return `https://media.discordapp.net/${String(key).slice(3)}`;
  if (appId && /^[0-9]+$/.test(String(appId))) return `https://cdn.discordapp.com/app-assets/${appId}/${key}.png`;
  return '';
}

const BADGE_FLAGS: Record<number, { name: string; icon: string }> = {
  1: { name: 'Discord Staff', icon: 'https://cdn.discordapp.com/badge-icons/5e74e9b61934ec1ca76d772cc9adc3e2.png' },
  2: { name: 'Partnered Server Owner', icon: 'https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de45e.png' },
  4: { name: 'HypeSquad Events', icon: 'https://cdn.discordapp.com/badge-icons/bf01a1073932342d80a46c02605c1acb.png' },
  8: { name: 'Bug Hunter Level 1', icon: 'https://cdn.discordapp.com/badge-icons/2717692c7dca245542db8f478a8ddf7a.png' },
  64: { name: 'HypeSquad Bravery', icon: 'https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png' },
  128: { name: 'HypeSquad Brilliance', icon: 'https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1b2c2a28.png' },
  256: { name: 'HypeSquad Balance', icon: 'https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png' },
  512: { name: 'Early Supporter', icon: 'https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2bbad.png' },
  16384: { name: 'Bug Hunter Level 2', icon: 'https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f815a05e1c656b1.png' },
  65536: { name: 'Verified Bot Developer', icon: 'https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png' },
  131072: { name: 'Early Verified Bot Developer', icon: 'https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png' },
  262144: { name: 'Discord Certified Moderator', icon: 'https://cdn.discordapp.com/badge-icons/fadfd2b4a6bacb459dd1134b7c6d27b1.png' },
  4194304: { name: 'Active Developer', icon: 'https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png' },
  268435456: { name: 'Premium Early Supporter', icon: 'https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2bbad.png' },
};

export function decodeBadgesFromFlags(publicFlags: number): BadgeInfo[] {
  if (!publicFlags || publicFlags === 0) return [];

  const badges: BadgeInfo[] = [];
  for (const [flag, badgeInfo] of Object.entries(BADGE_FLAGS)) {
    if ((publicFlags & parseInt(flag)) !== 0) {
      badges.push({
        name: badgeInfo.name,
        icon: badgeInfo.icon,
      });
    }
  }
  return badges;
}

export function extractBadges(lanyard: LanyardResponse['data'] | null, dstn: DstnResponse | null): BadgeInfo[] {
  // Get badges from dstn.to API first (detailed badges with descriptions and links)
  // IMPORTANT: Preserve the exact order from the API response - do not sort!
  if (dstn?.badges && Array.isArray(dstn.badges)) {
    // Map badges in the exact order they appear in the API response
    // The API already returns badges in the correct Discord order
    return dstn.badges.map(badge => ({
      name: badge.description || badge.id || 'Badge',
      icon: badge.icon ? `https://cdn.discordapp.com/badge-icons/${badge.icon}.png` : '',
      link: badge.link || '',
    }));
  }

  // Fallback to Lanyard API (decode from public_flags)
  if (lanyard?.discord_user?.public_flags) {
    return decodeBadgesFromFlags(lanyard.discord_user.public_flags);
  }

  return [];
}

export function extractGuildTags(lanyard: LanyardResponse['data'] | null, dstn: DstnResponse | null): GuildTag[] {
  const guildTags: GuildTag[] = [];
  const seenTagNames = new Set<string>();

  const addGuildTag = (tagName: string, guildId?: string, badgeUrl?: string) => {
    if (!tagName) return;

    const tagNameLower = tagName.toLowerCase();
    const uniqueKey = guildId ? `${guildId}_${tagNameLower}` : tagNameLower;

    if (!seenTagNames.has(uniqueKey)) {
      seenTagNames.add(uniqueKey);
      guildTags.push({
        text: tagName,
        badge: badgeUrl || '',
        tooltip: `Server Tag: ${tagName}`,
        guildId: guildId,
      });
    }
  };

  // Get guild tags from dstn.to API first
  if (dstn?.user) {
    if (dstn.user.primary_guild) {
      const primaryGuild = dstn.user.primary_guild;
      if (primaryGuild.tag && primaryGuild.identity_guild_id) {
        const guildId = primaryGuild.identity_guild_id;
        const tagName = primaryGuild.tag;
        const badgeHash = primaryGuild.badge || '';
        const badgeUrl = badgeHash ? `https://cdn.discordapp.com/clan-badges/${guildId}/${badgeHash}.png?size=16` : '';
        addGuildTag(tagName, guildId, badgeUrl);
      }
    }
    if (dstn.user.clan) {
      const clan = dstn.user.clan;
      if (clan.tag && clan.identity_guild_id) {
        const guildId = clan.identity_guild_id;
        const tagName = clan.tag;
        const badgeHash = clan.badge || '';
        const badgeUrl = badgeHash ? `https://cdn.discordapp.com/clan-badges/${guildId}/${badgeHash}.png?size=16` : '';
        addGuildTag(tagName, guildId, badgeUrl);
      }
    }
  }

  // Fallback to Lanyard API data
  if (lanyard?.discord_user?.primary_guild) {
    const primaryGuild = lanyard.discord_user.primary_guild;
    if (primaryGuild.tag && primaryGuild.identity_guild_id) {
      const guildId = primaryGuild.identity_guild_id;
      const tagName = primaryGuild.tag;
      let badgeUrl = '';
      if (primaryGuild.badge) {
        badgeUrl = `https://cdn.discordapp.com/clan-badges/${guildId}/${primaryGuild.badge}.png?size=16`;
      } else if (lanyard.discord_user.badge) {
        badgeUrl = `https://cdn.discordapp.com/clan-badges/${guildId}/${lanyard.discord_user.badge}.png?size=16`;
      }
      addGuildTag(tagName, guildId, badgeUrl);
    }
  }

  if (lanyard?.kv?.guild_tags && Array.isArray(lanyard.kv.guild_tags)) {
    lanyard.kv.guild_tags.forEach(tag => {
      const tagObj = typeof tag === 'string' ? { name: tag, text: tag } : tag;
      const tagName = tagObj.name || tagObj.text || tagObj.guild_name || '';
      const guildId = tagObj.guild_id || tagObj.identity_guild_id || '';

      if (tagName) {
        let badgeUrl = '';
        if (tagObj.icon) {
          badgeUrl = `https://cdn.discordapp.com/icons/${guildId}/${tagObj.icon}.png?size=16`;
        } else if (guildId) {
          if (lanyard.discord_user.badge) {
            badgeUrl = `https://cdn.discordapp.com/clan-badges/${guildId}/${lanyard.discord_user.badge}.png?size=16`;
          } else {
            badgeUrl = `https://cdn.discordapp.com/icons/${guildId}/a_${guildId}.png?size=16`;
          }
        }
        addGuildTag(tagName, guildId, badgeUrl);
      }
    });
  }

  return guildTags;
}

export function getAvatarUrl(user: LanyardResponse['data']['discord_user'] | null, dstnUser: DstnResponse['user'] | null): string {
  let avatarHash = null;
  let userId = null;

  if (dstnUser?.avatar && dstnUser?.id) {
    avatarHash = dstnUser.avatar;
    userId = dstnUser.id;
  } else if (user?.avatar && user?.id) {
    avatarHash = user.avatar;
    userId = user.id;
  }

  if (avatarHash && userId) {
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=4096`;
  } else if (userId) {
    const defaultAvatarNum = parseInt(user?.discriminator || '0') % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
  }

  return 'https://cdn.discordapp.com/embed/avatars/0.png';
}

export function getDisplayName(user: LanyardResponse['data']['discord_user'] | null, dstnUser: DstnResponse['user'] | null): string {
  return dstnUser?.global_name ||
    dstnUser?.display_name ||
    user?.global_name ||
    user?.display_name ||
    user?.username ||
    'User';
}

export function getUsername(user: LanyardResponse['data']['discord_user'] | null): string {
  return user?.username || 'unknown';
}

export function getBannerUrl(lanyard: LanyardResponse['data'] | null, dstn: DstnResponse | null, customBannerUrl?: string): string | null {
  if (customBannerUrl) return customBannerUrl;

  // Try dstn.to API first
  if (dstn?.user_profile?.banner) {
    const bannerHash = dstn.user_profile.banner;
    // Animated banners have hash starting with 'a_', use .gif extension
    const extension = bannerHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/banners/${dstn.user.id}/${bannerHash}.${extension}?size=1024`;
  }

  // Fallback to Lanyard (if available in future)
  return null;
}

export function getStatus(lanyard: LanyardResponse['data'] | null): 'online' | 'idle' | 'dnd' | 'offline' {
  if (!lanyard) return 'offline';
  return normalizeStatus(lanyard.discord_status);
}

export function getCustomStatus(lanyard: LanyardResponse['data'] | null): { emoji: string; text: string } | null {
  const customStatus = lanyard?.activities?.find(a => a.type === 4);
  if (customStatus?.state) {
    return {
      emoji: customStatus.emoji?.name || '💭',
      text: customStatus.state,
    };
  }
  return null;
}

export function formatLastSeenTime(lantern: LanternResponse | null): string | null {
  if (!lantern) return null;

  let mostRecent: number | null = null;

  // Try new API structure first (last_seen_at with unix timestamp)
  if (lantern.last_seen_at?.unix) {
    // Convert from seconds to milliseconds
    mostRecent = lantern.last_seen_at.unix * 1000;
  }
  // Fallback to legacy API structure (last_seen with platform timestamps)
  else if (lantern.last_seen) {
    const lastSeen = lantern.last_seen;
    const timestamps = [lastSeen.desktop, lastSeen.mobile, lastSeen.web].filter(Boolean) as number[];
    if (timestamps.length > 0) {
      mostRecent = Math.max(...timestamps);
    }
  }

  if (!mostRecent) return null;

  const diffMs = Date.now() - mostRecent;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  if (months > 0) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  if (weeks > 0) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  return 'just now';
}

