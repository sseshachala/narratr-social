import { Buffer } from 'node:buffer';
import { createOrUpdateProviderAccount } from '@/lib/db/provider-accounts';
import { upsertProviderToken } from '@/lib/db/provider-tokens';
import { env } from '@/lib/env';
import { clearOauthCookie, readOauthCookie } from '@/lib/providers/twitter/oauth';
import { twitterApi } from '@/lib/providers/twitter/client';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  try {
    const oauth = await readOauthCookie();
    if (!code || state !== oauth.state) {
      return Response.redirect(`${env.appUrl}/integrations?error=twitter_oauth_failed`, 302);
    }

    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${env.twitterClientId}:${env.twitterClientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: env.twitterClientId,
        redirect_uri: env.twitterRedirectUri,
        code_verifier: oauth.verifier,
      }).toString(),
      cache: 'no-store',
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return Response.redirect(`${env.appUrl}/integrations?error=${encodeURIComponent(tokenPayload?.error_description || 'twitter_token_failed')}`, 302);
    }

    const me = await twitterApi<{ data: { id: string; name: string; username: string } }>('/users/me?user.fields=id,name,username', {
      token: tokenPayload.access_token,
    });

    const providerAccount = await createOrUpdateProviderAccount({
      brand_id: oauth.brandId,
      provider: 'twitter',
      provider_user_id: me.data.id,
      provider_username: me.data.username,
      display_name: me.data.name,
      metadata: { raw_profile: me.data },
      status: 'connected',
      disconnected_at: null,
    });

    await upsertProviderToken({
      provider_account_id: providerAccount.id,
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token || null,
      expires_at: tokenPayload.expires_in ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString() : null,
      scope: typeof tokenPayload.scope === 'string' ? tokenPayload.scope.split(' ') : null,
      token_type: tokenPayload.token_type || 'bearer',
    });

    await clearOauthCookie();
    return Response.redirect(`${env.appUrl}/posts?provider=twitter&accountId=${providerAccount.id}&connected=true`, 302);
  } catch (error) {
    await clearOauthCookie();
    const message = error instanceof Error ? error.message : 'twitter_callback_failed';
    return Response.redirect(`${env.appUrl}/integrations?error=${encodeURIComponent(message)}`, 302);
  }
}
