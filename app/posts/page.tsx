import { env } from '@/lib/env';
import { PostsPageClient } from '@/components/posts/PostsPageClient';

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const params = await searchParams;
  return <PostsPageClient defaultBrandId={env.seedBrandId} initialAccountId={params.accountId} />;
}
