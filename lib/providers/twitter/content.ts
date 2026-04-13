import { RANGE_PRESETS } from '@/lib/providers/constants';
import { twitterApi } from '@/lib/providers/twitter/client';
import type { RangePreset, TwitterMedia, TwitterPost } from '@/lib/providers/types';

function rangeToWindow(range: RangePreset) {
  const days = RANGE_PRESETS[range];
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

function mapIncludedMedia(includes: any): Map<string, TwitterMedia> {
  return new Map(
    (includes?.media || []).map((item: any) => [
      item.media_key,
      {
        media_key: item.media_key,
        type: item.type,
        url: item.url || null,
        preview_image_url: item.preview_image_url || null,
        width: item.width || null,
        height: item.height || null,
      },
    ]),
  );
}

function mapPost(tweet: any, mediaByKey: Map<string, TwitterMedia>): TwitterPost {
  const mediaKeys = tweet.attachments?.media_keys || [];
  return {
    id: tweet.id,
    text: tweet.text || '',
    created_at: tweet.created_at,
    metrics: {
      like_count: tweet.public_metrics?.like_count || 0,
      reply_count: tweet.public_metrics?.reply_count || 0,
      repost_count: tweet.public_metrics?.retweet_count || tweet.public_metrics?.repost_count || 0,
      quote_count: tweet.public_metrics?.quote_count || 0,
      impression_count: tweet.public_metrics?.impression_count ?? null,
    },
    media: mediaKeys.map((mediaKey: string) => mediaByKey.get(mediaKey)).filter(Boolean) as TwitterMedia[],
  };
}

export async function fetchAuthoredTweets(userId: string, token: string, range: RangePreset): Promise<TwitterPost[]> {
  const { start, end } = rangeToWindow(range);
  const posts: TwitterPost[] = [];
  let nextToken: string | null = null;

  do {
    const params = new URLSearchParams({
      max_results: '100',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      'tweet.fields': 'created_at,public_metrics,text,attachments',
      expansions: 'attachments.media_keys',
      'media.fields': 'media_key,type,url,preview_image_url,width,height',
    });

    if (nextToken) params.set('pagination_token', nextToken);

    const response = await twitterApi<{ data?: any[]; includes?: { media?: any[] }; meta?: { next_token?: string } }>(
      `/users/${userId}/tweets?${params.toString()}`,
      { token },
    );

    const mediaByKey = mapIncludedMedia(response.includes);
    posts.push(...(response.data || []).map((tweet) => mapPost(tweet, mediaByKey)));
    nextToken = response.meta?.next_token || null;
  } while (nextToken);

  return posts;
}
