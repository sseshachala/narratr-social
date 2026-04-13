import { env } from '@/lib/env';

const FACEBOOK_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_read_user_content',
  'business_management',
].join(',');

export function buildFacebookOAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.facebookAppId,
    redirect_uri: env.facebookRedirectUri,
    scope: FACEBOOK_SCOPES,
    response_type: 'code',
    state,
  });

  return `https://www.facebook.com/${env.facebookApiVersion}/dialog/oauth?${params.toString()}`;
}
