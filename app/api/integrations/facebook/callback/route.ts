import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { exchangeCodeForToken, exchangeForLongLivedToken, buildExpiryDate } from '@/lib/facebook/tokens';
import { fetchFacebookPages, fetchFacebookProfile } from '@/lib/facebook/assets';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.cookies.get('fb_oauth_state')?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${env.appUrl}/integrations?error=facebook_oauth_state_mismatch`);
  }

  try {
    const shortToken = await exchangeCodeForToken(code);
    const longToken = await exchangeForLongLivedToken(shortToken.access_token);
    const profile = await fetchFacebookProfile(longToken.access_token);
    const pages = await fetchFacebookPages(longToken.access_token);

    const { data: account, error } = await supabaseAdmin.from('integration_accounts').upsert({
      app_user_id: env.defaultAppUserId,
      provider: 'facebook',
      provider_user_id: profile.id,
      provider_user_name: profile.name,
      access_token: shortToken.access_token,
      long_lived_token: longToken.access_token,
      token_expires_at: buildExpiryDate(longToken.expires_in),
      status: 'connected',
      raw_profile: profile,
      raw_token_payload: { shortToken, longToken },
      updated_at: new Date().toISOString(),
      disconnected_at: null,
    }, { onConflict: 'app_user_id,provider' }).select().single();
    if (error || !account) throw new Error(error?.message || 'Failed to store Facebook account');

    await supabaseAdmin.from('integration_assets').delete().eq('app_user_id', env.defaultAppUserId).eq('provider', 'facebook');
    if ((pages.data || []).length > 0) {
      await supabaseAdmin.from('integration_assets').insert((pages.data || []).map((page) => ({
        integration_account_id: account.id,
        app_user_id: env.defaultAppUserId,
        provider: 'facebook',
        asset_id: page.id,
        asset_name: page.name,
        asset_type: 'page',
        access_token: page.access_token || null,
        selected: false,
        raw_payload: page,
        ig_business_account_id: page.instagram_business_account?.id || null,
        ig_business_account_name: page.instagram_business_account?.username || page.instagram_business_account?.name || null,
        updated_at: new Date().toISOString(),
      })));
    }

    const response = NextResponse.redirect(`${env.appUrl}/integrations?provider=facebook&connected=true`);
    response.cookies.delete('fb_oauth_state');
    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'facebook_callback_failed';
    return NextResponse.redirect(`${env.appUrl}/integrations?error=${encodeURIComponent(message)}`);
  }
}
