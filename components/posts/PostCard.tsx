import type { SocialPost } from '@/components/posts/types';
import { SectionCard } from '@/components/ui/SectionCard';

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)));
    return `${hours}h ago`;
  }

  const days = Math.floor(diffMs / dayMs);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatCount(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { notation: value >= 1000 ? 'compact' : 'standard' }).format(value);
}

export function PostCard({ post, username }: { post: SocialPost; username?: string | null }) {
  const permalink = username ? `https://x.com/${username}/status/${post.id}` : null;
  const primaryMedia = post.media[0];

  return (
    <SectionCard
      bodyClassName="space-y-5"
      actions={<p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{formatRelativeDate(post.created_at)}</p>}
      title={post.author_name || username || 'Connected account'}
      description={post.author_username ? `@${post.author_username}` : undefined}
    >
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.text || 'Media-only post'}</p>

      {primaryMedia ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
          {primaryMedia.type === 'video' ? (
            <video controls className="max-h-[460px] w-full bg-black" preload="metadata">
              {primaryMedia.url ? <source src={primaryMedia.url} /> : null}
            </video>
          ) : primaryMedia.url || primaryMedia.preview_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryMedia.url || primaryMedia.preview_image_url || ''}
              alt="Post media"
              className="max-h-[460px] w-full object-cover"
            />
          ) : (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">Media attached</div>
          )}
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Likes', post.metrics.like_count],
          ['Replies', post.metrics.reply_count],
          ['Reposts', post.metrics.repost_count],
          ['Quotes', post.metrics.quote_count],
          ['Impressions', post.metrics.impression_count],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{formatCount(value as number | null)}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">Post ID: {post.id}</p>
        {permalink ? (
          <a
            href={permalink}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            View Post
          </a>
        ) : null}
      </div>
    </SectionCard>
  );
}
