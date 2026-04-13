'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/ToastProvider';
import {
  MAX_IMAGE_COUNT,
  RECOMMENDED_FEED_IMAGE,
  RECOMMENDED_LANDSCAPE_VIDEO,
  RECOMMENDED_SQUARE_IMAGE,
  RECOMMENDED_VERTICAL_VIDEO,
  getImageRecommendation,
  getVideoRecommendation,
  isImageType,
  isVideoType,
  validateMediaSelection,
} from '@/lib/posts/media-rules';
import type { ProviderAccountSummary } from '@/components/posts/types';

interface MediaDraft {
  id: string;
  file: File;
  previewUrl: string;
  warning?: string | null;
  width?: number | null;
  height?: number | null;
}

const MAX_TWEET_LENGTH = 280;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

function readVideoSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

export function CreatePostPageClient({ defaultBrandId, initialAccountId }: { defaultBrandId: string; initialAccountId?: string }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [accounts, setAccounts] = useState<ProviderAccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId || '');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mediaDrafts, setMediaDrafts] = useState<MediaDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await fetch(`/api/brands/${defaultBrandId}/provider-accounts`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load connected accounts');
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

  const mediaDraftsRef = useRef<MediaDraft[]>([]);
  useEffect(() => { mediaDraftsRef.current = mediaDrafts; }, [mediaDrafts]);
  useEffect(() => () => { mediaDraftsRef.current.forEach((draft) => URL.revokeObjectURL(draft.previewUrl)); }, []);

  const remainingCharacters = MAX_TWEET_LENGTH - text.length;
  const selectedAccount = useMemo(() => accounts.find((account) => account.id === selectedAccountId) || null, [accounts, selectedAccountId]);
  const warnings = mediaDrafts.map((draft) => draft.warning).filter(Boolean) as string[];

  async function createDraft(file: File): Promise<MediaDraft> {
    const previewUrl = URL.createObjectURL(file);
    let width: number | null = null;
    let height: number | null = null;
    let warning: string | null = null;

    if (isImageType(file.type)) {
      const size = await readImageSize(file);
      width = size?.width ?? null;
      height = size?.height ?? null;
      warning = getImageRecommendation(width, height);
    } else if (isVideoType(file.type)) {
      const size = await readVideoSize(file);
      width = size?.width ?? null;
      height = size?.height ?? null;
      warning = getVideoRecommendation(width, height);
    }

    return {
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl,
      width,
      height,
      warning,
    };
  }

  async function appendFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const { errors } = validateMediaSelection([...mediaDrafts.map((draft) => draft.file), ...incoming]);
    if (errors.length > 0) {
      setError(errors[0]);
      pushToast({ title: errors[0], variant: 'error' });
      return;
    }
    const nextDrafts = await Promise.all(incoming.map((file) => createDraft(file)));
    const containsVideo = nextDrafts.some((draft) => isVideoType(draft.file.type));
    setError('');
    setMediaDrafts((current) => (containsVideo ? nextDrafts : [...current, ...nextDrafts].slice(0, MAX_IMAGE_COUNT)));
  }

  function removeMedia(id: string) {
    setMediaDrafts((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
    void appendFiles(event.dataTransfer.files);
    event.dataTransfer.clearData();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
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
      mediaDrafts.forEach((draft) => formData.append('media', draft.file));
      console.info('posts.publish.start', { providerAccountId: selectedAccountId, textLength: text.length, mediaCount: mediaDrafts.length, mediaTypes: mediaDrafts.map((draft) => draft.file.type) });
      const res = await fetch(`/api/provider-accounts/${selectedAccountId}/posts`, { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create post');
      console.info('posts.publish.success', { providerAccountId: selectedAccountId, postId: json.post?.id });
      pushToast({ title: 'Post published successfully', variant: 'success' });
      setTitle('');
      setText('');
      setMediaDrafts((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
      router.push(`/posts?posted=1&accountId=${selectedAccountId}&postId=${json.post?.id || ''}`);
    } catch (submitError) {
      console.error('posts.publish.error', submitError);
      const message = submitError instanceof Error ? submitError.message : 'Failed to create post';
      setError(message);
      pushToast({ title: message, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const previewMedia = mediaDrafts[0];

  return (
    <AppShell
      title="Create Post"
      description="Draft a new post for your connected X account. Write once, preview it live, then publish with confidence."
      actions={<div className="flex gap-3"><Link href="/posts" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">View Posts</Link><button type="button" disabled className="rounded-2xl border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-400">Generate with AI (next)</button></div>}
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,420px)]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex rounded-2xl border border-slate-300 p-1 text-sm font-medium">
            <span className="rounded-xl bg-slate-900 px-4 py-2 text-white">Write Post</span>
            <span className="rounded-xl px-4 py-2 text-slate-400">Generate with AI</span>
          </div>

          {error ? <Alert variant="error" title="Could not publish">{error}</Alert> : null}
          {warnings.length > 0 ? <Alert variant="warning" title="Media guidance">{warnings[0]}</Alert> : null}

          <label className="block text-sm font-medium text-slate-700">
            Post content
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={8} placeholder="What would you like to share?" className="mt-2 block w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-500" />
            <span className={['mt-2 block text-right text-xs font-medium', remainingCharacters < 0 ? 'text-rose-600' : remainingCharacters < 20 ? 'text-amber-600' : 'text-slate-400'].join(' ')}>{text.length} / {MAX_TWEET_LENGTH}</span>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Title <span className="font-normal text-slate-400">(optional)</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional title for internal use" className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500" />
          </label>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Media</p>
            <label onDragEnter={(event) => { event.preventDefault(); setIsDragActive(true); }} onDragOver={(event) => { event.preventDefault(); setIsDragActive(true); }} onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragActive(false); }} onDrop={handleDrop} className={['flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-10 text-center transition', isDragActive ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200' : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'].join(' ')}>
              <span className="text-sm font-medium text-slate-700">Drag image or video here</span>
              <span className="mt-1 text-sm text-slate-500">or click to upload</span>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,video/mp4" multiple onChange={(event) => { void appendFiles(event.target.files); event.currentTarget.value = ''; }} />
            </label>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">4 images max</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">1 video max</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">JPG PNG WebP MP4</span>
              <button type="button" onClick={() => setShowGuidelines((current) => !current)} className="ml-1 text-sm font-medium text-slate-700 underline underline-offset-4">{showGuidelines ? 'Hide recommended sizes' : 'View recommended sizes'}</button>
            </div>

            {showGuidelines ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="grid gap-4 md:grid-cols-2">
                  <div><p className="font-semibold text-slate-900">Images</p><p className="mt-1">Use {RECOMMENDED_FEED_IMAGE.label} for feed posts, or {RECOMMENDED_SQUARE_IMAGE.label} for a safe square backup.</p></div>
                  <div><p className="font-semibold text-slate-900">Videos</p><p className="mt-1">Use {RECOMMENDED_VERTICAL_VIDEO.label} for vertical posts, or {RECOMMENDED_LANDSCAPE_VIDEO.label} for landscape.</p></div>
                </div>
                <p className="mt-4">Design once, post everywhere: start in Canva or Figma with {RECOMMENDED_VERTICAL_VIDEO.label}, then crop to {RECOMMENDED_FEED_IMAGE.label} for feed posts.</p>
              </div>
            ) : null}

            {mediaDrafts.length > 0 ? <div className="grid gap-4 sm:grid-cols-2">{mediaDrafts.map((draft) => <div key={draft.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><div className="aspect-video bg-slate-100">{isVideoType(draft.file.type) ? <video src={draft.previewUrl} className="h-full w-full object-cover" controls preload="metadata" /> : <img src={draft.previewUrl} alt={draft.file.name} className="h-full w-full object-cover" />}</div><div className="space-y-2 px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-700">{draft.file.name}</p><p className="text-xs text-slate-400">{formatFileSize(draft.file.size)}{draft.width && draft.height ? ` · ${draft.width} × ${draft.height}` : ''}</p></div><button type="button" onClick={() => removeMedia(draft.id)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Remove</button></div>{draft.warning ? <Alert variant="warning">{draft.warning}</Alert> : null}</div></div>)}</div> : null}
          </div>

          <div className="sticky bottom-4 z-10 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Publishing to {selectedAccount?.display_name || selectedAccount?.provider_username || 'your connected X account'}.</p>
              <div className="flex gap-3">
                <button type="button" disabled className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-400">Generate with AI</button>
                <button type="submit" disabled={submitting || !selectedAccountId || remainingCharacters < 0} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{submitting ? 'Posting…' : 'Post Now'}</button>
              </div>
            </div>
          </div>
        </form>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">Post preview</h2><span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Preview</span></div>
            <div className="mt-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[15px] font-semibold text-slate-900">{selectedAccount?.display_name || 'Organic Sphere LLC'}</p><p className="text-sm text-slate-500">@{selectedAccount?.provider_username || 'organic_sphere'}</p></div></div>
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-slate-700">{text.trim() || 'Your post preview will appear here as you type.'}</p>
              {previewMedia ? <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">{isVideoType(previewMedia.file.type) ? <video controls className="w-full bg-black" preload="metadata"><source src={previewMedia.previewUrl} /></video> : <img src={previewMedia.previewUrl} alt={previewMedia.file.name} className="w-full object-cover" />}</div> : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Destination</h2>
            {selectedAccount ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><p className="font-semibold text-slate-900">{selectedAccount.display_name || selectedAccount.provider_username || 'Connected account'}</p><p className="mt-1">@{selectedAccount.provider_username || selectedAccount.provider_user_id || 'twitter'}</p></div> : <p className="mt-4 text-sm text-slate-600">Connect an X account from the integrations page first.</p>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm font-medium text-slate-700">Platform<input value="X / Twitter" readOnly className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" /></label>
              <label className="block text-sm font-medium text-slate-700">Account<select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)} disabled={loadingAccounts || accounts.length === 0} className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500">{accounts.length === 0 ? <option value="">No connected X accounts</option> : null}{accounts.map((account) => <option key={account.id} value={account.id}>{account.display_name || account.provider_username || account.provider_user_id}</option>)}</select></label>
            </div>
            <Link href="/integrations" className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Manage connections</Link>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
