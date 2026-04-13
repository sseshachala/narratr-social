import { z } from 'zod';
import { getProviderAccountById } from '@/lib/db/provider-accounts';
import { jsonError, jsonOk } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';
import { twitterApi } from '@/lib/providers/twitter/client';
import { getValidTwitterToken } from '@/lib/providers/twitter/tokens';

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({ text: z.string().trim().min(1).max(280) });

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    const body = parseOrThrow(bodySchema, await req.json());
    const account = await getProviderAccountById(params.id);
    if (account.provider !== 'twitter') {
      return Response.json({ error: 'Provider account is not Twitter' }, { status: 400 });
    }

    const token = await getValidTwitterToken(account.id);
    const result = await twitterApi<{ data: { id: string; text: string } }>('/tweets', {
      method: 'POST',
      token: token.access_token,
      body: JSON.stringify({ text: body.text }),
    });

    return jsonOk({ post: result.data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
