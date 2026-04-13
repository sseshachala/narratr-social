import { RANGE_PRESETS } from '@/lib/providers/constants';
import { twitterApi } from '@/lib/providers/twitter/client';
import type { RangePreset, TwitterMessage, TwitterMedia } from '@/lib/providers/types';

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

export async function fetchMentions(userId: string, token: string, range: RangePreset): Promise<TwitterMessage[]> {
  const { start, end } = rangeToWindow(range);
  const messages: TwitterMessage[] = [];
  let nextToken: string | null = null;

  do {
    const params = new URLSearchParams({
      max_results: '100',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      'tweet.fields': 'created_at,public_metrics,text,author_id,conversation_id,attachments',
      expansions: 'attachments.media_keys',
      'media.fields': 'media_key,type,url,preview_image_url,width,height',
    });

    if (nextToken) params.set('pagination_token', nextToken);

    const response = await twitterApi<{ data?: any[]; includes?: { media?: any[] }; meta?: { next_token?: string } }>(
      `/users/${userId}/mentions?${params.toString()}`,
      { token },
    );

    const mediaByKey = mapIncludedMedia(response.includes);

    messages.push(...(response.data || []).map((tweet) => ({
      id: tweet.id,
      text: tweet.text || '',
      created_at: tweet.created_at,
      author_id: tweet.author_id,
      conversation_id: tweet.conversation_id,
      metrics: {
        like_count: tweet.public_metrics?.like_count || 0,
        reply_count: tweet.public_metrics?.reply_count || 0,
        repost_count: tweet.public_metrics?.retweet_count || tweet.public_metrics?.repost_count || 0,
        quote_count: tweet.public_metrics?.quote_count || 0,
        impression_count: tweet.public_metrics?.impression_count ?? null,
      },
      media: (tweet.attachments?.media_keys || []).map((key: string) => mediaByKey.get(key)).filter(Boolean) as TwitterMedia[],
    })));

    nextToken = response.meta?.next_token || null;
  } while (nextToken);

  return messages;
}
