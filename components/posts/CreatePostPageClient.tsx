'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import type { ProviderAccountSummary } from '@/components/posts/types';

interface MediaDraft {
  id: string;
  file: File;
  previewUrl: string;
}

const MAX_TWEET_LENGTH = 280;

export function CreatePostPageClient({ defaultBrandId, initialAccountId }: { defaultBrandId: string; initialAccountId?: string }) {
  const [accounts, setAccounts] = useState<ProviderAccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId || '');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mediaDrafts, setMediaDrafts] = useState<MediaDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await fetch(`/api/brands/${defaultBrandId}/provider-accounts`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load connected accounts');
        const twitterAccounts = (json.provider_accounts || []).filter(
          (account: ProviderAccountSummary) => account.provider === 'twitter' && account.status === 'connected',
        );
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

  const mediaDraftsRef = useRef<MediaDraft[]>([]);

  useEffect(() => {
    mediaDraftsRef.current = mediaDrafts;
  }, [mediaDrafts]);

  useEffect(() => () => {
    mediaDraftsRef.current.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
  }, []);

  const remainingCharacters = MAX_TWEET_LENGTH - text.length;
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || null,
    [accounts, selectedAccountId],
  );

  function appendFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    const containsVideo = incoming.some((file) => file.type.startsWith('video/'));
    const containsImage = incoming.some((file) => file.type.startsWith('image/'));

    if (containsVideo && (incoming.length > 1 || mediaDrafts.length > 0)) {
      setError('Only one video can be attached to a post.');
      return;
    }

    if (containsVideo && containsImage) {
      setError('Choose either one video or up to four images for a post.');
      return;
    }

    const totalImages = [...mediaDrafts, ...incoming.filter((file) => file.type.startsWith('image/'))];
    if (!containsVideo && totalImages.length > 4) {
      setError('You can attach up to four images.');
      return;
    }

    const nextDrafts = incoming.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setError('');
    setMediaDrafts(containsVideo ? nextDrafts : [...mediaDrafts, ...nextDrafts]);
  }

  function removeMedia(id: string) {
    setMediaDrafts((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    const { files } = event.dataTransfer;
    if (files?.length) {
      appendFiles(files);
      event.dataTransfer.clearData();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedAccountId) {
      setError('Connect an X account before creating a post.');
      return;
    }

    if (!text.trim() && mediaDrafts.length === 0) {
      setError('Add post copy or attach media before posting.');
      return;
    }

    if (remainingCharacters < 0) {
      setError('The post exceeds the X character limit.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('text', text);
      for (const draft of mediaDrafts) {
        formData.append('media', draft.file);
      }

      const res = await fetch(`/api/provider-accounts/${selectedAccountId}/posts`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create post');

      setSuccess('Post published successfully.');
      setTitle('');
      setText('');
      setMediaDrafts((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Create Post"
      description="Draft a new post for your connected X account. You can write it manually now and plug your AI-generated text and brand images into the same flow later."
      actions={
        <div className="flex gap-3">
          <Link href="/posts" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            View Posts
          </Link>
          <button type="button" disabled className="rounded-2xl border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-400">
            Generate with AI (next)
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex rounded-2xl border border-slate-300 p-1 text-sm font-medium">
            <span className="rounded-xl bg-slate-900 px-4 py-2 text-white">Write Post</span>
            <span className="rounded-xl px-4 py-2 text-slate-400">Generate with AI</span>
          </div>

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
          {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div> : null}

          <label className="block text-sm font-medium text-slate-700">
            Title <span className="font-normal text-slate-400">(optional)</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional title for internal use"
              className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Post content
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              placeholder="What would you like to share?"
              className="mt-2 block w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-500"
            />
            <span className={[
              'mt-2 block text-right text-xs font-medium',
              remainingCharacters < 0 ? 'text-rose-600' : remainingCharacters < 20 ? 'text-amber-600' : 'text-slate-400',
            ].join(' ')}>
              {text.length} / {MAX_TWEET_LENGTH}
            </span>
          </label>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Media</p>
            <label
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={[
                'flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-10 text-center transition',
                isDragActive
                  ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100',
              ].join(' ')}
            >
              <span className="text-sm font-medium text-slate-700">Drag image or video here</span>
              <span className="mt-1 text-sm text-slate-500">or click to upload</span>
              <span className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Max 4 images or 1 video</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,video/*"
                multiple
                onChange={(event) => {
                  appendFiles(event.target.files);
                  event.currentTarget.value = '';
                }}
              />
            </label>

            {mediaDrafts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {mediaDrafts.map((draft) => (
                  <div key={draft.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    <div className="aspect-video bg-slate-100">
                      {draft.file.type.startsWith('video/') ? (
                        <video src={draft.previewUrl} className="h-full w-full object-cover" controls preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.previewUrl} alt={draft.file.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-700">{draft.file.name}</p>
                        <p className="text-xs text-slate-400">{Math.round(draft.file.size / 1024)} KB</p>
                      </div>
                      <button type="button" onClick={() => removeMedia(draft.id)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Platform
              <input value="X / Twitter" readOnly className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Account
              <select
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                disabled={loadingAccounts || accounts.length === 0}
                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              >
                {accounts.length === 0 ? <option value="">No connected X accounts</option> : null}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.display_name || account.provider_username || account.provider_user_id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !selectedAccountId || remainingCharacters < 0}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? 'Posting…' : 'Post Now'}
            </button>
            <button type="button" disabled className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-400">
              Generate with AI
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Flow</h2>
            <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
              <li><span className="font-semibold text-slate-900">1.</span> Choose the connected X account.</li>
              <li><span className="font-semibold text-slate-900">2.</span> Write the post text and optionally attach media.</li>
              <li><span className="font-semibold text-slate-900">3.</span> Publish now. A later AI step can prefill the same fields.</li>
            </ol>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Connected destination</h2>
            {selectedAccount ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{selectedAccount.display_name || selectedAccount.provider_username || 'Connected account'}</p>
                <p className="mt-1">@{selectedAccount.provider_username || selectedAccount.provider_user_id || 'twitter'}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">Connect an X account from the integrations page first.</p>
            )}
            <Link href="/integrations" className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Manage connections
            </Link>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
