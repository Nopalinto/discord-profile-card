// Lanyard API Types

export interface LanyardUser {
  id: string;
  username: string;
  display_name?: string;
  global_name?: string;
  discriminator?: string;
  avatar?: string;
  avatar_decoration?: string;
  avatar_decoration_data?: {
    asset: string;
  };
  public_flags?: number;
  primary_guild?: {
    tag: string;
    identity_guild_id: string;
    badge?: string;
  };
  badge?: string;
}

export interface LanyardActivity {
  id?: string;
  name: string;
  type: number; // 0: Playing, 1: Streaming, 2: Listening, 3: Watching, 4: Custom Status, 5: Competing
  url?: string;
  created_at?: number;
  timestamps?: {
    start?: number;
    end?: number;
  };
  application_id?: string;
  details?: string;
  details_url?: string;
  state?: string;
  state_url?: string;
  emoji?: {
    name: string;
    id?: string;
    animated?: boolean;
    url?: string; // Sometimes provided
  };
  party?: {
    id?: string;
    size?: [number, number];
  };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  secrets?: {
    join?: string;
    spectate?: string;
    match?: string;
  };
  buttons?: string[];
  instance?: boolean;
  flags?: number;
  sync_id?: string;
  session_id?: string;
}

export interface LanyardSpotify {
  track_id: string;
  timestamps: {
    start: number;
    end: number;
  };
  song: string;
  artist: string;
  album_art_url: string;
  album: string;
}

export interface LanyardResponse {
  success: boolean;
  data: {
    discord_user: LanyardUser;
    discord_status: 'online' | 'idle' | 'dnd' | 'offline' | 'invisible';
    activities: LanyardActivity[];
    spotify?: LanyardSpotify;
    kv?: {
      guild_tags?: Array<string | {
        name?: string;
        text?: string;
        guild_name?: string;
        guild_id?: string;
        identity_guild_id?: string;
        icon?: string;
      }>;
    };
  };
}

