import type { SocialPost } from '@/components/posts/types';

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < dayMs) return `${Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)))}h ago`;
  const days = Math.floor(diffMs / dayMs);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatCount(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { notation: value >= 1000 ? 'compact' : 'standard' }).format(value);
}

export function PostCard({ post, username, highlighted = false }: { post: SocialPost; username?: string | null; highlighted?: boolean }) {
  const permalink = username ? `https://x.com/${username}/status/${post.id}` : null;
  const primaryMedia = post.media[0];

  return (
    <article id={`post-${post.id}`} className={[
      'rounded-3xl border bg-white p-5 shadow-sm transition',
      highlighted ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{post.author_name || username || 'Connected account'}</p>
          {post.author_username ? <p className="text-sm text-slate-500">@{post.author_username}</p> : null}
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{formatRelativeDate(post.created_at)}</p>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{post.text || 'Media-only post'}</p>

      {primaryMedia ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {primaryMedia.type === 'video' ? (
            <video controls className="max-h-[420px] w-full bg-black" preload="metadata">
              {primaryMedia.url ? <source src={primaryMedia.url} /> : null}
            </video>
          ) : primaryMedia.url || primaryMedia.preview_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryMedia.url || primaryMedia.preview_image_url || ''} alt="Post media" className="max-h-[420px] w-full object-cover" />
          ) : (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">Media attached</div>
          )}
        </div>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Likes', post.metrics.like_count],
          ['Replies', post.metrics.reply_count],
          ['Reposts', post.metrics.repost_count],
          ['Quotes', post.metrics.quote_count],
          ['Impressions', post.metrics.impression_count],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
            <dt className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{formatCount(value as number | null)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-slate-500">Post ID: {post.id}</p>
        {permalink ? <a href={permalink} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">View Post</a> : null}
      </div>
    </article>
  );
}
