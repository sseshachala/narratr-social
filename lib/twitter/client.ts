export async function twitterApi(path: string, token: string) {
  const url = `https://api.twitter.com/2${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.title || json?.detail || 'Twitter API failed');
  return json;
}
