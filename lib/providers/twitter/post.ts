import { twitterApi } from '@/lib/providers/twitter/client';
import { uploadMediaFiles } from '@/lib/providers/twitter/media';

export interface PublishTweetInput {
  text?: string;
  files?: File[];
}

export interface PublishTweetResult {
  id: string;
  text: string;
}

export async function publishTweet(input: PublishTweetInput, token: string): Promise<PublishTweetResult> {
  const mediaIds = input.files && input.files.length > 0 ? await uploadMediaFiles(input.files, token) : [];

  const payload: Record<string, unknown> = {
    text: input.text?.trim() || undefined,
  };

  if (mediaIds.length > 0) {
    payload.media = { media_ids: mediaIds };
  }

  const response = await twitterApi<{ data: { id: string; text: string } }>('/tweets', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });

  return response.data;
}
