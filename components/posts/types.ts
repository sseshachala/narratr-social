export type RangePreset = '7d' | '30d';

export interface PostMediaItem {
  media_key: string;
  type: string;
  url?: string | null;
  preview_image_url?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface SocialPost {
  id: string;
  text: string;
  created_at: string;
  author_name?: string | null;
  author_username?: string | null;
  metrics: {
    like_count: number;
    reply_count: number;
    repost_count: number;
    quote_count: number;
    impression_count: number | null;
  };
  media: PostMediaItem[];
}

export interface ProviderAccountSummary {
  id: string;
  brand_id: string;
  provider: string;
  provider_user_id: string | null;
  provider_username: string | null;
  display_name: string | null;
  status: string;
}
