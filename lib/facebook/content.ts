import { facebookGraph } from '@/lib/facebook/graph';

export async function fetchPagePosts(pageId: string, pageToken: string, limit = 25) {
  return facebookGraph<{ data: Array<{ id: string; message?: string; created_time?: string; permalink_url?: string }> }>(
    `/${pageId}/posts`,
    pageToken,
    { fields: 'id,message,created_time,permalink_url', limit: String(limit) }
  );
}

export async function fetchPostEngagement(postId: string, pageToken: string) {
  const result = await facebookGraph<{
    id: string;
    reactions?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
  }>(`/${postId}`, pageToken, {
    fields: 'id,reactions.summary(true),comments.summary(true)',
  });

  const reactions = result.reactions?.summary?.total_count || 0;
  const comments = result.comments?.summary?.total_count || 0;
  return { reactions, comments, total: reactions + comments, raw: result };
}
