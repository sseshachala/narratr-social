export type ProviderId = 'facebook' | 'instagram' | 'twitter' | 'google_business_profile';
export type ProviderAccountStatus = 'connected' | 'disconnected' | 'error';
export type RangePreset = '7d' | '30d';

export interface BrandRecord {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderAccountRecord {
  id: string;
  brand_id: string;
  provider: ProviderId;
  provider_user_id: string | null;
  provider_username: string | null;
  display_name: string | null;
  status: ProviderAccountStatus;
  metadata: Record<string, unknown> | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderTokenRecord {
  id: string;
  provider_account_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string[] | null;
  token_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface TwitterMedia {
  media_key: string;
  type: string;
  url?: string | null;
  preview_image_url?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface TwitterPost {
  id: string;
  text: string;
  created_at: string;
  metrics: {
    like_count: number;
    reply_count: number;
    repost_count: number;
    quote_count: number;
    impression_count: number | null;
  };
  media: TwitterMedia[];
}

export interface TwitterMessage extends TwitterPost {
  author_id?: string;
  conversation_id?: string;
}
