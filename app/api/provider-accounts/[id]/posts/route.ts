import { z } from 'zod';
import { getProviderAccountById } from '@/lib/db/provider-accounts';
import { ApiError } from '@/lib/http/errors';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';
import { validateMediaSelection } from '@/lib/posts/media-rules';
import { fetchAuthoredTweets } from '@/lib/providers/twitter/content';
import { publishTweet } from '@/lib/providers/twitter/post';
import { getValidTwitterToken } from '@/lib/providers/twitter/tokens';

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({ range: z.enum(['7d', '30d']).default('7d') });

function assertTwitterAccount(provider: string) {
  if (provider !== 'twitter') throw new ApiError(400, 'This route currently supports Twitter/X accounts only');
}

function validateMediaFiles(files: File[]) {
  const { errors } = validateMediaSelection(files.map((file) => ({ type: file.type, size: file.size })));
  if (errors.length > 0) throw new ApiError(400, errors[0]);
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    const query = parseOrThrow(querySchema, Object.fromEntries(new URL(req.url).searchParams.entries()));
    const providerAccount = await getProviderAccountById(params.id);
    assertTwitterAccount(providerAccount.provider);
    if (!providerAccount.provider_user_id) throw new ApiError(400, 'Connected Twitter account is missing provider user id');

    console.info('posts.fetch.start', { providerAccountId: providerAccount.id, provider: providerAccount.provider, range: query.range });
    const token = await getValidTwitterToken(providerAccount.id);
    const posts = await fetchAuthoredTweets(providerAccount.provider_user_id, token.access_token, query.range ?? '7d');
    console.info('posts.fetch.success', { providerAccountId: providerAccount.id, range: query.range, count: posts.length });

    return jsonOk({ posts, provider_account: { id: providerAccount.id, display_name: providerAccount.display_name, provider_username: providerAccount.provider_username } });
  } catch (error) {
    console.error('posts.fetch.error', error);
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
    if (!text && files.length === 0) throw new ApiError(400, 'Add post copy or attach media before publishing');

    console.info('posts.publish.start', { providerAccountId: providerAccount.id, provider: providerAccount.provider, titleLength: title.length, textLength: text.length, mediaCount: files.length, mediaTypes: files.map((file) => file.type) });
    const token = await getValidTwitterToken(providerAccount.id);
    const post = await publishTweet({ text, files }, token.access_token);
    console.info('posts.publish.success', { providerAccountId: providerAccount.id, postId: post.id });

    return jsonOk({ post }, { status: 201 });
  } catch (error) {
    console.error('posts.publish.error', error);
    return jsonError(error);
  }
}
