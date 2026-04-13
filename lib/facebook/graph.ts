import { env } from '@/lib/env';

export async function facebookGraph<T>(path: string, token: string, search?: Record<string, string>) {
  const params = new URLSearchParams({ access_token: token, ...(search || {}) });
  const url = `https://graph.facebook.com/${env.facebookApiVersion}${path}?${params.toString()}`;
  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error?.message || 'Facebook Graph request failed');
  return json as T;
}
