import { twitterApi } from '@/lib/providers/twitter/client';

export interface TwitterAnalytics {
  tweet_id: string;
  like_count: number;
  reply_count: number;
  repost_count: number;
  quote_count: number;
  impression_count: number | null;
}

export async function fetchTweetAnalytics(tweetId: string, token: string): Promise<TwitterAnalytics> {
  const params = new URLSearchParams({
    'tweet.fields': 'public_metrics',
  });

  const response = await twitterApi<{ data: any }>(`/tweets/${tweetId}?${params.toString()}`, { token });
  return {
    tweet_id: response.data.id,
    like_count: response.data.public_metrics?.like_count || 0,
    reply_count: response.data.public_metrics?.reply_count || 0,
    repost_count: response.data.public_metrics?.retweet_count || response.data.public_metrics?.repost_count || 0,
    quote_count: response.data.public_metrics?.quote_count || 0,
    impression_count: response.data.public_metrics?.impression_count ?? null,
  };
}
