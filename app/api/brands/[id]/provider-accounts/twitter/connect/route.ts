import { z } from 'zod';
import { getBrandById } from '@/lib/db/brands';
import { jsonError } from '@/lib/http/responses';
import { parseOrThrow } from '@/lib/http/validation';
import {
  buildTwitterOAuthUrl,
  createOauthContext,
  generateCodeChallenge,
  writeOauthCookie,
} from '@/lib/providers/twitter/oauth';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = parseOrThrow(paramsSchema, await context.params);
    await getBrandById(params.id);

    const oauthContext = createOauthContext(params.id);
    const url = buildTwitterOAuthUrl(oauthContext.state, generateCodeChallenge(oauthContext.verifier));
    await writeOauthCookie(oauthContext);

    return Response.json({ authorization_url: url });
  } catch (error) {
    return jsonError(error);
  }
}
