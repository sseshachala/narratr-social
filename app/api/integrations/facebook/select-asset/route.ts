import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const { assetId } = await request.json() as { assetId?: string };
  if (!assetId) return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
  await supabaseAdmin.from('integration_assets').update({ selected: false, updated_at: new Date().toISOString() }).eq('app_user_id', env.defaultAppUserId).eq('provider', 'facebook');
  const { error } = await supabaseAdmin.from('integration_assets').update({ selected: true, updated_at: new Date().toISOString() }).eq('app_user_id', env.defaultAppUserId).eq('provider', 'facebook').eq('asset_id', assetId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
