function required(name: string, ...fallbacks: string[]) {
  const candidates = [name, ...fallbacks];

  for (const key of candidates) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }

  throw new Error(`Missing environment variable: ${name}`);
}

function optional(name: string, fallback = '', ...aliases: string[]) {
  const candidates = [name, ...aliases];

  for (const key of candidates) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

export const env = {
  supabaseUrl: required('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseServiceRoleKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseSecret: required('SUPABASE_SECRET_KEY'),

  twitterClientId: required('TWITTER_CLIENT_ID'),
  twitterClientSecret: required('TWITTER_CLIENT_SECRET'),
  twitterRedirectUri: required('TWITTER_REDIRECT_URI'),

  facebookAppId: optional('FACEBOOK_APP_ID', ''),
  facebookAppSecret: optional('FACEBOOK_APP_SECRET', ''),
  facebookRedirectUri: optional('FACEBOOK_REDIRECT_URI', ''),
  facebookApiVersion: optional('FACEBOOK_API_VERSION', 'v22.0'),

  defaultAppUserId: optional('DEFAULT_APP_USER_ID', 'demo-user'),
  seedBrandId: required('DEFAULT_BRAND_ID'),

  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
