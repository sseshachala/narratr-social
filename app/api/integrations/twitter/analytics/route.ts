import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { fetchTweetAnalytics } from '@/lib/providers/twitter/analytics';
import { fetchAuthoredTweets } from '@/lib/providers/twitter/content';
import { getValidTwitterToken } from '@/lib/providers/twitter/tokens';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { mode?: 'range' | 'content'; contentId?: string };
    const { data: account, error } = await supabaseAdmin
      .from('provider_accounts')
      .select('*')
      .eq('brand_id', env.seedBrandId)
      .eq('provider', 'twitter')
      .eq('status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!account?.id || !account.provider_user_id) {
      return Response.json({ error: 'No Twitter connection' }, { status: 400 });
    }

    const token = await getValidTwitterToken(account.id);

    if (body.mode === 'content' && body.contentId) {
      const analytics = await fetchTweetAnalytics(body.contentId, token.access_token);
      return jsonOk(analytics);
    }

    const tweets = await fetchAuthoredTweets(account.provider_user_id, token.access_token, '30d');
    const aggregated = tweets.reduce(
      (acc, tweet) => {
        acc.like_count += tweet.metrics.like_count;
        acc.repost_count += tweet.metrics.repost_count;
        acc.impression_count += tweet.metrics.impression_count ?? 0;
        return acc;
      },
      { like_count: 0, repost_count: 0, impression_count: 0 },
    );

    return jsonOk({ ...aggregated, evaluated_count: tweets.length });
  } catch (error) {
    return jsonError(error);
  }
}
