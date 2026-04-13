import { NextResponse } from 'next/server';
import { buildFacebookOAuthUrl } from '@/lib/facebook/auth';

export async function GET() {
  const state = crypto.randomUUID();
  const redirectUrl = buildFacebookOAuthUrl(state);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set('fb_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return response;
}
