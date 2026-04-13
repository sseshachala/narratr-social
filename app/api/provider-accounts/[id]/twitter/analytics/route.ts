import { z } from 'zod';
import { getProviderAccountById } from '@/lib/db/provider-accounts';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';
import { fetchTweetAnalytics } from '@/lib/providers/twitter/analytics';
import { getValidTwitterToken } from '@/lib/providers/twitter/tokens';

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({ tweetId: z.string().min(1) });

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    const query = parseOrThrow(querySchema, Object.fromEntries(new URL(req.url).searchParams.entries()));
    const account = await getProviderAccountById(params.id);
    if (account.provider !== 'twitter') {
      return Response.json({ error: 'Provider account is not Twitter' }, { status: 400 });
    }

    const token = await getValidTwitterToken(account.id);
    const analytics = await fetchTweetAnalytics(query.tweetId, token.access_token);
    return jsonOk({ analytics });
  } catch (error) {
    return jsonError(error);
  }
}
