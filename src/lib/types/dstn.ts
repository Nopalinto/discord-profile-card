// dstn.to API Types

export interface DstnUser {
  id: string;
  username: string;
  display_name?: string;
  global_name?: string;
  avatar?: string;
  banner_color?: string;
  accent_color?: number;
  display_name_styles?: {
    font_id?: number;
    effect_id?: number;
    colors?: number[];
  };
  primary_guild?: {
    tag: string;
    identity_guild_id: string;
    badge?: string;
  };
  clan?: {
    tag: string;
    identity_guild_id: string;
    badge?: string;
  };
}

export interface DstnUserProfile {
  bio?: string;
  pronouns?: string;
  theme_colors?: [number, number]; // [primary, accent] as hex numbers
  banner?: string;
}

export interface DstnBadge {
  id: string;
  description?: string;
  icon?: string;
  link?: string;
}

export interface DstnConnectedAccount {
  type: string;
  name: string;
  verified?: boolean;
}

export interface DstnPremiumInfo {
  since?: string;
  expires_at?: string;
}

export interface DstnResponse {
  user: DstnUser;
  user_profile?: DstnUserProfile;
  badges?: DstnBadge[];
  connected_accounts?: DstnConnectedAccount[];
  premium?: DstnPremiumInfo;
}

