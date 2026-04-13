import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from('integration_accounts').update({ status: 'disconnected', access_token: null, long_lived_token: null, token_expires_at: null, disconnected_at: now, updated_at: now }).eq('app_user_id', env.defaultAppUserId).eq('provider', 'facebook');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabaseAdmin.from('integration_assets').update({ selected: false, access_token: null, updated_at: now }).eq('app_user_id', env.defaultAppUserId).eq('provider', 'facebook');
  return NextResponse.json({ success: true });
}
