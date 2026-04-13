import { ApiError } from '@/lib/http/errors';

const API_BASE = 'https://api.x.com/2';

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  token: string;
  headers?: HeadersInit;
}

export async function twitterApi<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, json?.title || json?.detail || 'Twitter API request failed', json);
  }

  return json as T;
}
