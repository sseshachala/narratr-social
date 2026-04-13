import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchPagePosts, fetchPostEngagement } from '@/lib/facebook/content';

function inRange(dateString: string | undefined, fromDate?: string, toDate?: string) {
  if (!dateString) return false;
  const t = new Date(dateString).getTime();
  const from = fromDate ? new Date(fromDate).getTime() : Number.NEGATIVE_INFINITY;
  const to = toDate ? new Date(`${toDate}T23:59:59.999Z`).getTime() : Number.POSITIVE_INFINITY;
  return t >= from && t <= to;
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { mode?: 'range' | 'content'; fromDate?: string; toDate?: string; contentId?: string };
  const { data: asset } = await supabaseAdmin.from('integration_assets').select('*').eq('app_user_id', env.defaultAppUserId).eq('provider', 'facebook').eq('selected', true).maybeSingle();
  if (!asset?.access_token) return NextResponse.json({ error: 'No selected Facebook Page' }, { status: 400 });

  if (body.mode === 'content') {
    if (!body.contentId) return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
    const result = await fetchPostEngagement(body.contentId, asset.access_token);
    return NextResponse.json({ reactions: result.reactions, comments: result.comments, total: result.total });
  }

  const posts = await fetchPagePosts(asset.asset_id, asset.access_token, 100);
  const filtered = (posts.data || []).filter((post) => inRange(post.created_time, body.fromDate, body.toDate));
  let reactions = 0;
  let comments = 0;
  for (const post of filtered) {
    const metrics = await fetchPostEngagement(post.id, asset.access_token);
    reactions += metrics.reactions;
    comments += metrics.comments;
  }
  return NextResponse.json({ reactions, comments, total: reactions + comments, evaluatedCount: filtered.length });
}
