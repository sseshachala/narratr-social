import { env } from '@/lib/env';

export function buildTwitterOAuthUrl(state: string, codeChallenge: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.twitterClientId,
    redirect_uri: env.twitterRedirectUri,
    scope: 'tweet.read tweet.write users.read media.write offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}
