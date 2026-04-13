'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PostCard } from '@/components/posts/PostCard';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/ToastProvider';
import type { ProviderAccountSummary, RangePreset, SocialPost } from '@/components/posts/types';

interface PostsPageClientProps {
  defaultBrandId: string;
  initialAccountId?: string;
}

export function PostsPageClient({ defaultBrandId, initialAccountId }: PostsPageClientProps) {
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const posted = searchParams.get('posted') === '1';
  const highlightedPostId = searchParams.get('postId');
  const [showSuccessBanner, setShowSuccessBanner] = useState(posted);
  const [accounts, setAccounts] = useState<ProviderAccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId || '');
  const [range, setRange] = useState<RangePreset>('7d');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [error, setError] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (posted) pushToast({ title: 'Post published successfully', variant: 'success' });
  }, [posted, pushToast]);

  useEffect(() => {
    if (!highlightedPostId || posts.length === 0) return;
    const node = document.getElementById(`post-${highlightedPostId}`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlightedPostId, posts]);

  useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      setLoadingAccounts(true);
      setError('');
      try {
        const res = await fetch(`/api/brands/${defaultBrandId}/provider-accounts`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load accounts');
        const twitterAccounts = (json.provider_accounts || []).filter((account: ProviderAccountSummary) => account.provider === 'twitter' && account.status === 'connected');
        if (cancelled) return;
        setAccounts(twitterAccounts);
        setSelectedAccountId((current) => current || twitterAccounts[0]?.id || '');
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Failed to load accounts');
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    }
    void loadAccounts();
    return () => { cancelled = true; };
  }, [defaultBrandId]);

  useEffect(() => {
    if (!selectedAccountId) {
      setPosts([]);
      return;
    }
    let cancelled = false;
    async function loadPosts() {
      setLoadingPosts(true);
      setError('');
      try {
        console.info('posts.fetch.start', { providerAccountId: selectedAccountId, range });
        const res = await fetch(`/api/provider-accounts/${selectedAccountId}/posts?range=${range}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load posts');
        if (cancelled) return;
        setPosts(json.posts || []);
        console.info('posts.fetch.success', { providerAccountId: selectedAccountId, range, count: (json.posts || []).length });
      } catch (loadError) {
        console.error('posts.fetch.error', loadError);
        if (!cancelled) {
          setPosts([]);
          setError(loadError instanceof Error ? loadError.message : 'Failed to load posts');
        }
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    }
    void loadPosts();
    return () => { cancelled = true; };
  }, [range, selectedAccountId]);

  const selectedAccount = useMemo(() => accounts.find((account) => account.id === selectedAccountId) || null, [accounts, selectedAccountId]);

  return (
    <AppShell
      title="Posts"
      description="View recent posts from connected X accounts, switch between the last 7 or 30 days, and jump straight back into creating something new."
      actions={<Link href={selectedAccountId ? `/posts/create?accountId=${selectedAccountId}` : '/posts/create'} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">Create Post</Link>}
    >
      <section className="space-y-5">
        {showSuccessBanner ? <Alert variant="success" title="Your post was published." dismissible onDismiss={() => setShowSuccessBanner(false)}>It has been added to the latest posts feed below.</Alert> : null}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,280px)_minmax(220px,280px)_auto]">
              <label className="block text-sm font-medium text-slate-700">Platform
                <input value="X / Twitter" readOnly className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Account
                <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)} disabled={loadingAccounts || accounts.length === 0} className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500">
                  {accounts.length === 0 ? <option value="">No connected X accounts</option> : null}
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.display_name || account.provider_username || account.provider_user_id}</option>)}
                </select>
              </label>
              <div>
                <p className="text-sm font-medium text-slate-700">Range</p>
                <div className="mt-2 inline-flex rounded-2xl border border-slate-300 p-1">
                  {(['7d', '30d'] as RangePreset[]).map((option) => <button key={option} type="button" onClick={() => setRange(option)} className={['rounded-xl px-4 py-2 text-sm font-medium transition', range === option ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'].join(' ')}>Last {option === '7d' ? '7 days' : '30 days'}</button>)}
                </div>
              </div>
            </div>
            {selectedAccount ? <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"><p className="font-medium text-slate-900">{selectedAccount.display_name || selectedAccount.provider_username || 'Connected account'}</p><p>@{selectedAccount.provider_username || selectedAccount.provider_user_id || 'twitter'}</p></div> : null}
          </div>
        </div>

        {error ? <Alert variant="error" title="Could not load posts">{error}</Alert> : null}

        {!loadingAccounts && accounts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"><h2 className="text-xl font-semibold text-slate-900">Connect an X account to view posts</h2><p className="mt-3 text-sm text-slate-600">Once the social account is connected, this page will list posts from the last 7 or 30 days.</p><Link href="/integrations" className="mt-6 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Open Integrations</Link></div>
        ) : loadingPosts ? (
          <div className="grid gap-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />)}</div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"><h2 className="text-xl font-semibold text-slate-900">No posts found for this range</h2><p className="mt-3 text-sm text-slate-600">Try a 30-day view or create a new post to start filling this feed.</p><Link href="/posts/create" className="mt-6 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Create Post</Link></div>
        ) : (
          <div className="grid gap-5">{posts.map((post) => <PostCard key={post.id} post={post} username={selectedAccount?.provider_username} highlighted={post.id === highlightedPostId} />)}</div>
        )}
      </section>
    </AppShell>
  );
}
