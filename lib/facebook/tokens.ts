import { env } from '@/lib/env';

export async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    client_id: env.facebookAppId,
    client_secret: env.facebookAppSecret,
    redirect_uri: env.facebookRedirectUri,
    code,
  });
  const url = `https://graph.facebook.com/${env.facebookApiVersion}/oauth/access_token?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message || 'Failed to exchange code for token');
  return json;
}

export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: env.facebookAppId,
    client_secret: env.facebookAppSecret,
    fb_exchange_token: shortLivedToken,
  });
  const url = `https://graph.facebook.com/${env.facebookApiVersion}/oauth/access_token?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message || 'Failed to exchange long-lived token');
  return json;
}

export function buildExpiryDate(expiresIn?: number | null): string | null {
  if (!expiresIn) return null;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}
