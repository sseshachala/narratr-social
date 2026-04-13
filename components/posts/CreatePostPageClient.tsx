'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard } from '@/components/ui/SectionCard';
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
  const [showGuidelines, setShowGuidelines] = useState(false);

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

  const canSubmit = !!selectedAccountId && remainingCharacters >= 0 && (!!text.trim() || mediaDrafts.length > 0) && !submitting;
  const primaryMedia = mediaDrafts[0] || null;

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

    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
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
      description="Compose on the left, keep a live preview and destination context on the right, and publish when the post looks right."
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
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <SectionCard title="Compose" description="Write the post first, then fine-tune with media and preview it before publishing.">
            <div className="space-y-6">
              <div className="inline-flex rounded-2xl border border-slate-300 p-1 text-sm font-medium">
                <span className="rounded-xl bg-slate-900 px-4 py-2 text-white">Write Post</span>
                <span className="rounded-xl px-4 py-2 text-slate-400">Generate with AI</span>
              </div>

              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

              <label className="block text-sm font-medium text-slate-700">
                Post content
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={8}
                  placeholder="What would you like to share?"
                  className="mt-2 block w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none transition focus:border-slate-500"
                />
                <span className={[
                  'mt-2 block text-right text-xs font-medium',
                  remainingCharacters < 0 ? 'text-rose-600' : remainingCharacters < 20 ? 'text-amber-600' : 'text-slate-400',
                ].join(' ')}>
                  {text.length} / {MAX_TWEET_LENGTH}
                </span>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Title <span className="font-normal text-slate-400">(optional for internal workflows)</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optional title for internal use"
                  className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard title="Media" description="Attach up to four images or one video. Use the compact recommendations when you need a safe cross-platform size.">
            <div className="space-y-4">
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

              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1.5">4 images max</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">1 video max</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">JPG PNG WebP MP4</span>
                <button
                  type="button"
                  onClick={() => setShowGuidelines((current) => !current)}
                  className="rounded-full px-1 py-1.5 font-medium text-slate-700 underline decoration-slate-300 underline-offset-4"
                >
                  {showGuidelines ? 'Hide recommended sizes' : 'View recommended sizes'}
                </button>
              </div>

              {showGuidelines ? (
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Images</p>
                    <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
                      <li>Primary feed: 1080 × 1350 (4:5)</li>
                      <li>Safe backup: 1080 × 1080 (1:1)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Videos</p>
                    <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
                      <li>Vertical: 1080 × 1920 (9:16)</li>
                      <li>Landscape: 1920 × 1080 (16:9)</li>
                    </ul>
                  </div>
                  <p className="md:col-span-2 text-sm leading-6 text-slate-600">Create once in Canva or Figma at 1080 × 1920, then crop to 1080 × 1350 for feed posts when needed.</p>
                </div>
              ) : null}

              {mediaDrafts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
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
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
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
          </SectionCard>

          <div className="hidden lg:block">
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? 'Posting…' : 'Post Now'}
              </button>
              <button type="button" disabled className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-400">
                Generate with AI
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-6 xl:sticky xl:top-5">
          <SectionCard title="Post preview" description="A tighter X-style preview that stays visible while you refine the copy.">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold tracking-tight text-slate-950">{selectedAccount?.display_name || 'Organic Sphere LLC'}</p>
                  <p className="mt-0.5 text-[13px] text-slate-500">@{selectedAccount?.provider_username || 'organic_sphere'}</p>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-300">Preview</span>
              </div>

              {(title || text) ? (
                <div className="mt-4 space-y-3 text-[15px] leading-7 text-slate-700">
                  {title ? <p className="font-medium text-slate-900">{title}</p> : null}
                  {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
                </div>
              ) : (
                <p className="mt-4 text-[15px] leading-7 text-slate-400">Your post preview will update as you type.</p>
              )}

              {primaryMedia ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                  {primaryMedia.file.type.startsWith('video/') ? (
                    <video src={primaryMedia.previewUrl} controls className="max-h-[480px] w-full bg-black object-cover" preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primaryMedia.previewUrl} alt={primaryMedia.file.name} className="max-h-[480px] w-full object-cover" />
                  )}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Destination" description="Keep the target account visible without using extra space in the main compose column.">
            <div className="space-y-4">
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
              <Link href="/integrations" className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Manage connections
              </Link>
            </div>
          </SectionCard>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{selectedAccount?.display_name || 'Select an X account'}</p>
            <p className="text-xs text-slate-500">{text.length} / {MAX_TWEET_LENGTH} characters</p>
          </div>
          <button
            type="button"
            onClick={() => document.querySelector('form')?.requestSubmit()}
            disabled={!canSubmit}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Posting…' : 'Post Now'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
