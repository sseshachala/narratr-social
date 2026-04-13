export type ProviderId = 'facebook' | 'instagram' | 'twitter';
export type AnalyticsMode = 'range' | 'content';

export interface ProviderAccountStatus {
  connected: boolean;
  account?: {
    provider_user_name?: string | null;
    status?: string | null;
  } | null;
}

export interface IntegrationAsset {
  id?: string;
  asset_id: string;
  asset_name: string;
  asset_type: string;
  selected: boolean;
  access_token?: string | null;
  ig_business_account_id?: string | null;
  ig_business_account_name?: string | null;
}

export interface IntegrationContentItem {
  id?: string;
  content_external_id?: string;
  kind?: string;
  text?: string | null;
  created_at_external?: string | null;
  permalink_url?: string | null;
  message?: string;
  created_time?: string;
}
