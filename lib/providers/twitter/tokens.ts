import { Buffer } from 'node:buffer';
import { env } from '@/lib/env';
import { getProviderTokenByAccountId, upsertProviderToken } from '@/lib/db/provider-tokens';
import type { ProviderTokenRecord } from '@/lib/providers/types';

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() < 60_000;
}

async function refreshTwitterToken(token: ProviderTokenRecord): Promise<ProviderTokenRecord> {
  if (!token.refresh_token) {
    throw new Error('Twitter refresh token is missing');
  }

  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${env.twitterClientId}:${env.twitterClientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
      client_id: env.twitterClientId,
    }).toString(),
    cache: 'no-store',
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || 'Failed to refresh Twitter token');
  }

  return upsertProviderToken({
    provider_account_id: token.provider_account_id,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || token.refresh_token,
    expires_at: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scope: typeof payload.scope === 'string' ? payload.scope.split(' ') : token.scope,
    token_type: payload.token_type || token.token_type,
  });
}

export async function getValidTwitterToken(providerAccountId: string): Promise<ProviderTokenRecord> {
  const token = await getProviderTokenByAccountId(providerAccountId);
  if (isExpiringSoon(token.expires_at)) {
    return refreshTwitterToken(token);
  }
  return token;
}
