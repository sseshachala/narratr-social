import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchPagePosts } from '@/lib/facebook/content';

export async function GET() {
  const { data: asset } = await supabaseAdmin.from('integration_assets').select('*').eq('app_user_id', env.defaultAppUserId).eq('provider', 'facebook').eq('selected', true).maybeSingle();
  if (!asset?.access_token) return NextResponse.json({ error: 'No selected Facebook Page' }, { status: 400 });
  const posts = await fetchPagePosts(asset.asset_id, asset.access_token, 25);
  return NextResponse.json({ content: posts.data || [] });
}
