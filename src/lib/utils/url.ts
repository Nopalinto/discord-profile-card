// URL parameter utilities

export interface UrlParams {
  id?: string;
  hideServerTag?: boolean;
  hideSpotify?: boolean;
  disableAnimatedAvatarDecoration?: boolean;
  hideActivityTime?: boolean;
  hideBadges?: boolean;
  hideActivity?: boolean;
  hideRecentActivity?: boolean;
  hideLastSeen?: boolean;
  hideDisplayName?: boolean;
  rawgApiKey?: string;
  colorScheme?: 'default' | 'dark' | 'light' | 'custom';
  primaryColor?: string;
  accentColor?: string;
  bannerUrl?: string;
  bannerColor?: string;
  hideAppId?: string[];
  displayNameFont?: string;
  displayNameEffect?: string;
  displayNameColor?: string;
  displayNameGradientStart?: string;
  displayNameGradientEnd?: string;
  transparent?: boolean;
}

export function parseUrlParams(searchParams: URLSearchParams): UrlParams {
  const params: UrlParams = {};

  const id = searchParams.get('id');
  if (id) params.id = id;

  params.hideServerTag = searchParams.get('hideServerTag') === '1';
  params.hideSpotify = searchParams.get('hideSpotify') === '1';
  params.disableAnimatedAvatarDecoration = searchParams.get('disableAnimatedAvatarDecoration') === '1';
  params.hideActivityTime = searchParams.get('hideActivityTime') === '1';
  params.hideBadges = searchParams.get('hideBadges') === '1';
  params.hideActivity = searchParams.get('hideActivity') === '1';
  params.hideRecentActivity = searchParams.get('hideRecentActivity') === '1';
  params.hideLastSeen = searchParams.get('hideLastSeen') === '1';
  params.hideDisplayName = searchParams.get('hideDisplayName') === '1';
  params.transparent = searchParams.get('transparent') === 'true' || searchParams.get('transparent') === '1';
  
  const rawgApiKey = searchParams.get('rawgApiKey');
  if (rawgApiKey) params.rawgApiKey = rawgApiKey;
  
  // Backward compatibility: if showDisplayName is in URL, convert it to hideDisplayName
  const showDisplayName = searchParams.get('showDisplayName');
  if (showDisplayName !== null) {
    params.hideDisplayName = showDisplayName === '0'; // If showDisplayName=0, then hideDisplayName=true
  }

  const colorScheme = searchParams.get('colorScheme');
  if (colorScheme && ['default', 'dark', 'light', 'custom'].includes(colorScheme)) {
    params.colorScheme = colorScheme as UrlParams['colorScheme'];
  }

  const primaryColor = searchParams.get('primaryColor');
  if (primaryColor) params.primaryColor = primaryColor;

  const accentColor = searchParams.get('accentColor');
  if (accentColor) params.accentColor = accentColor;

  const bannerUrl = searchParams.get('bannerUrl');
  if (bannerUrl) {
    try {
      params.bannerUrl = decodeURIComponent(bannerUrl);
    } catch {
      params.bannerUrl = bannerUrl;
    }
  }

  const bannerColor = searchParams.get('bannerColor');
  if (bannerColor) params.bannerColor = bannerColor;

  const hideAppId = searchParams.get('ignoreAppId');
  if (hideAppId) {
    params.hideAppId = hideAppId.split(',').filter(Boolean);
  }

  const displayNameFont = searchParams.get('displayNameFont');
  if (displayNameFont) params.displayNameFont = displayNameFont;

  const displayNameEffect = searchParams.get('displayNameEffect');
  if (displayNameEffect) params.displayNameEffect = displayNameEffect;

  const displayNameColor = searchParams.get('displayNameColor');
  if (displayNameColor) {
    // Decode gradient strings if they're URL encoded
    try {
      params.displayNameColor = decodeURIComponent(displayNameColor);
    } catch {
      params.displayNameColor = displayNameColor;
    }
  }

  const displayNameGradientStart = searchParams.get('displayNameGradientStart');
  if (displayNameGradientStart) params.displayNameGradientStart = displayNameGradientStart;

  const displayNameGradientEnd = searchParams.get('displayNameGradientEnd');
  if (displayNameGradientEnd) params.displayNameGradientEnd = displayNameGradientEnd;

  return params;
}

export function buildUrl(baseUrl: string, params: UrlParams): string {
  const url = new URL(baseUrl);
  
  if (params.id) url.searchParams.set('id', params.id);
  if (params.hideServerTag) url.searchParams.set('hideServerTag', '1');
  if (params.hideSpotify) url.searchParams.set('hideSpotify', '1');
  if (params.disableAnimatedAvatarDecoration) url.searchParams.set('disableAnimatedAvatarDecoration', '1');
  if (params.hideActivityTime) url.searchParams.set('hideActivityTime', '1');
  if (params.hideBadges) url.searchParams.set('hideBadges', '1');
  if (params.hideActivity) url.searchParams.set('hideActivity', '1');
  if (params.hideRecentActivity) url.searchParams.set('hideRecentActivity', '1');
  if (params.hideLastSeen) url.searchParams.set('hideLastSeen', '1');
  if (params.hideDisplayName) url.searchParams.set('hideDisplayName', '1');
  if (params.transparent) url.searchParams.set('transparent', 'true');
  // Don't include rawgApiKey in URL for security - it's stored in localStorage
  if (params.colorScheme) url.searchParams.set('colorScheme', params.colorScheme);
  if (params.primaryColor) url.searchParams.set('primaryColor', params.primaryColor);
  if (params.accentColor) url.searchParams.set('accentColor', params.accentColor);
  if (params.bannerUrl) url.searchParams.set('bannerUrl', params.bannerUrl);
  if (params.bannerColor) url.searchParams.set('bannerColor', params.bannerColor);
  if (params.hideAppId && params.hideAppId.length > 0) {
    url.searchParams.set('ignoreAppId', params.hideAppId.join(','));
  }
  if (params.displayNameFont) url.searchParams.set('displayNameFont', params.displayNameFont);
  if (params.displayNameEffect) url.searchParams.set('displayNameEffect', params.displayNameEffect);
  if (params.displayNameColor) {
    // URL encode gradient strings
    const encodedColor = params.displayNameColor.startsWith('linear-gradient') 
      ? encodeURIComponent(params.displayNameColor)
      : params.displayNameColor;
    url.searchParams.set('displayNameColor', encodedColor);
  }
  if (params.displayNameGradientStart) url.searchParams.set('displayNameGradientStart', params.displayNameGradientStart);
  if (params.displayNameGradientEnd) url.searchParams.set('displayNameGradientEnd', params.displayNameGradientEnd);

  return url.toString();
}

