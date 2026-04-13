import { env } from '@/lib/env';
import {
  buildTwitterOAuthUrl,
  createOauthContext,
  generateCodeChallenge,
  writeOauthCookie,
} from '@/lib/providers/twitter/oauth';

export async function GET() {
  const oauthContext = createOauthContext(env.seedBrandId);
  const url = buildTwitterOAuthUrl(oauthContext.state, generateCodeChallenge(oauthContext.verifier));
  await writeOauthCookie(oauthContext);
  return Response.redirect(url, 302);
}
