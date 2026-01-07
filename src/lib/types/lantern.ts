// Lantern API Types

export interface LanternPlatform {
  desktop?: 'online' | 'idle' | 'dnd' | 'offline';
  mobile?: 'online' | 'idle' | 'dnd' | 'offline';
  web?: 'online' | 'idle' | 'dnd' | 'offline';
}

export interface LanternResponse {
  last_seen_at?: {
    unix: number; // timestamp in seconds
    raw: string; // ISO string
  };
  active_platforms?: LanternPlatform;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  // Legacy support for old API structure
  last_seen?: {
    desktop?: number; // timestamp
    mobile?: number;
    web?: number;
  };
  platforms?: LanternPlatform;
  // Support both root-level and nested user structure
  display_name_styles?: {
    font_id?: number;
    effect_id?: number;
    colors?: number[];
  };
  user?: {
    display_name_styles?: {
      font_id?: number;
      effect_id?: number;
      colors?: number[];
    };
  };
}

