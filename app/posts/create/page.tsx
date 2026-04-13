import { env } from '@/lib/env';
import { CreatePostPageClient } from '@/components/posts/CreatePostPageClient';

export default async function CreatePostPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const params = await searchParams;
  return <CreatePostPageClient defaultBrandId={env.seedBrandId} initialAccountId={params.accountId} />;
}
