import { z } from 'zod';
import { getProviderAccountById } from '@/lib/db/provider-accounts';
import { ApiError } from '@/lib/http/errors';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';
import { fetchAuthoredTweets } from '@/lib/providers/twitter/content';
import { publishTweet } from '@/lib/providers/twitter/post';
import { getValidTwitterToken } from '@/lib/providers/twitter/tokens';

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({ range: z.enum(['7d', '30d']).default('7d') });

function assertTwitterAccount(provider: string) {
  if (provider !== 'twitter') {
    throw new ApiError(400, 'This route currently supports Twitter/X accounts only');
  }
}

function validateMediaFiles(files: File[]) {
  if (files.length === 0) return;
  const images = files.filter((file) => file.type.startsWith('image/'));
  const videos = files.filter((file) => file.type.startsWith('video/'));

  if (videos.length > 1) throw new ApiError(400, 'Only one video can be attached to a post');
  if (videos.length === 1 && files.length > 1) throw new ApiError(400, 'Choose either one video or up to four images');
  if (videos.length === 0 && images.length > 4) throw new ApiError(400, 'You can attach up to four images');
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    const query = parseOrThrow(querySchema, Object.fromEntries(new URL(req.url).searchParams.entries()));
    const providerAccount = await getProviderAccountById(params.id);
    assertTwitterAccount(providerAccount.provider);

    if (!providerAccount.provider_user_id) {
      throw new ApiError(400, 'Connected Twitter account is missing provider user id');
    }

    console.info('[posts.get] loading posts', {
      providerAccountId: providerAccount.id,
      provider: providerAccount.provider,
      range: query.range,
    });

    const token = await getValidTwitterToken(providerAccount.id);
    const posts = await fetchAuthoredTweets(providerAccount.provider_user_id, token.access_token, query.range ?? '7d');

    return jsonOk({
      posts,
      provider_account: {
        id: providerAccount.id,
        display_name: providerAccount.display_name,
        provider_username: providerAccount.provider_username,
      },
    });
  } catch (error) {
    console.error('[posts.get] failed', error);
    return jsonError(error);
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    const providerAccount = await getProviderAccountById(params.id);
    assertTwitterAccount(providerAccount.provider);

    const formData = await req.formData();
    const title = String(formData.get('title') || '').trim();
    const text = String(formData.get('text') || '').trim();
    const files = formData.getAll('media').filter((value): value is File => value instanceof File && value.size > 0);

    validateMediaFiles(files);

    if (!text && files.length === 0) {
      throw new ApiError(400, 'Add post copy or attach media before publishing');
    }

    console.info('[posts.post] publishing post', {
      providerAccountId: providerAccount.id,
      provider: providerAccount.provider,
      titleLength: title.length,
      textLength: text.length,
      mediaCount: files.length,
      mediaTypes: files.map((file) => file.type),
    });

    const token = await getValidTwitterToken(providerAccount.id);
    const post = await publishTweet({ text, files }, token.access_token);

    console.info('[posts.post] published', { providerAccountId: providerAccount.id, postId: post.id });

    return jsonOk({ post }, { status: 201 });
  } catch (error) {
    console.error('[posts.post] failed', error);
    return jsonError(error);
  }
}
