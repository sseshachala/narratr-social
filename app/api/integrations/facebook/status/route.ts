import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const { data: account, error } = await supabaseAdmin.from('integration_accounts').select('*').eq('app_user_id', env.defaultAppUserId).eq('provider', 'facebook').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connected: !!account && account.status === 'connected', account });
}
