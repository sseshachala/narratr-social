import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { TWITTER_SCOPES } from '@/lib/providers/constants';
import { ApiError } from '@/lib/http/errors';

const COOKIE_NAME = 'tw_oauth_ctx';

export interface TwitterOauthCookie {
  brandId: string;
  state: string;
  verifier: string;
}

function toBase64Url(buffer: Buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function generateCodeVerifier() {
  return toBase64Url(crypto.randomBytes(32));
}

export function generateCodeChallenge(verifier: string) {
  return toBase64Url(crypto.createHash('sha256').update(verifier).digest());
}

export function createOauthContext(brandId: string): TwitterOauthCookie {
  return {
    brandId,
    state: crypto.randomUUID(),
    verifier: generateCodeVerifier(),
  };
}

export function buildTwitterOAuthUrl(state: string, codeChallenge: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.twitterClientId,
    redirect_uri: env.twitterRedirectUri,
    scope: TWITTER_SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://x.com/i/oauth2/authorize?${params.toString()}`;
}

export async function writeOauthCookie(context: TwitterOauthCookie) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(context), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
}

export async function readOauthCookie(): Promise<TwitterOauthCookie> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) throw new ApiError(400, 'Missing Twitter OAuth context');

  try {
    return JSON.parse(raw) as TwitterOauthCookie;
  } catch {
    throw new ApiError(400, 'Invalid Twitter OAuth context');
  }
}

export async function clearOauthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
