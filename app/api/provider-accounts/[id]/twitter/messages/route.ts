import { z } from 'zod';
import { getProviderAccountById } from '@/lib/db/provider-accounts';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';
import { fetchMentions } from '@/lib/providers/twitter/messages';
import { getValidTwitterToken } from '@/lib/providers/twitter/tokens';

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({ range: z.enum(['7d', '30d']).default('7d') });

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    const query = parseOrThrow(querySchema, Object.fromEntries(new URL(req.url).searchParams.entries()));
    const account = await getProviderAccountById(params.id);
    if (account.provider !== 'twitter' || !account.provider_user_id) {
      return Response.json({ error: 'Provider account is not a connected Twitter account' }, { status: 400 });
    }

    const token = await getValidTwitterToken(account.id);
    const messages = await fetchMentions(account.provider_user_id, token.access_token, query.range ?? '7d');
    return jsonOk({ messages, range: query.range });
  } catch (error) {
    return jsonError(error);
  }
}
