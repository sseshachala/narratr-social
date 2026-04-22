'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard } from '@/components/ui/SectionCard';
import type { ProviderAccountSummary } from '@/components/posts/types';

interface MediaDraft {
  id: string;
  file: File;
  previewUrl: string;
}

// ── Per-channel configuration ─────────────────────────────────────────────────
interface ChannelConfig {
  label: string;
  charLimit: number;
  /** Tailwind ring / accent colour class */
  accent: string;
  /** Short code to render in previews */
  icon: string;
}

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  twitter:   { label: 'X / Twitter',  charLimit: 280,    accent: 'ring-black',      icon: '𝕏'  },
  linkedin:  { label: 'LinkedIn',      charLimit: 3000,   accent: 'ring-[#0A66C2]',  icon: 'in' },
  facebook:  { label: 'Facebook',      charLimit: 63206,  accent: 'ring-[#1877F2]',  icon: 'f'  },
  instagram: { label: 'Instagram',     charLimit: 2200,   accent: 'ring-[#E1306C]',  icon: '📷' },
};

const POSTING_LIMITS = [
  { platform: 'X / Twitter',  limit: '280 characters',     note: 'Links count as 23 chars' },
  { platform: 'LinkedIn',      limit: '3,000 characters',   note: 'Articles up to 120,000 chars' },
  { platform: 'Instagram',     limit: '2,200 characters',   note: '30 hashtags max' },
  { platform: 'Facebook',      limit: '63,206 characters',  note: 'Practically unlimited' },
];

function channelConfig(provider: string): ChannelConfig {
  return CHANNEL_CONFIG[provider] ?? { label: provider, charLimit: 63206, accent: 'ring-slate-400', icon: '●' };
}

export function CreatePostPageClient({ defaultBrandId, initialAccountId }: { defaultBrandId: string; initialAccountId?: string }) {
  const [accounts, setAccounts] = useState<ProviderAccountSummary[]>([]);
  // Multiple selected account IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialAccountId ? [initialAccountId] : []));
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mediaDrafts, setMediaDrafts] = useState<MediaDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showLimitsTooltip, setShowLimitsTooltip] = useState(false);
  // Which channel's preview is active in the preview panel
  const [previewAccountId, setPreviewAccountId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await fetch(`/api/brands/${defaultBrandId}/provider-accounts`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load connected accounts');
        // All connected accounts across all providers
        const connected: ProviderAccountSummary[] = (json.provider_accounts || []).filter(
          (a: ProviderAccountSummary) => a.status === 'connected',
        );
        if (cancelled) return;
        setAccounts(connected);
        // Auto-select pre-existing initialAccountId or first account
        setSelectedIds((current) => {
          if (current.size > 0) return current;
          const first = connected[0]?.id;
          return first ? new Set([first]) : new Set();
        });
        setPreviewAccountId((current) => current || connected[0]?.id || '');
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

  // The most restrictive char limit among selected channels
  const selectedAccounts = accounts.filter((a) => selectedIds.has(a.id));
  const bindingLimit = selectedAccounts.reduce<number>((min, a) => {
    const limit = channelConfig(a.provider).charLimit;
    return limit < min ? limit : min;
  }, Infinity);
  const effectiveLimit = isFinite(bindingLimit) ? bindingLimit : null;
  const remainingCharacters = effectiveLimit !== null ? effectiveLimit - text.length : null;

  const previewAccount = accounts.find((a) => a.id === previewAccountId) ?? selectedAccounts[0] ?? null;

  function toggleAccount(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
    // If the deselected account was the active preview, shift to another selected one
    setPreviewAccountId((current) => {
      if (current !== id) return current;
      const remaining = [...selectedIds].filter((sid) => sid !== id);
      return remaining[0] ?? id;
    });
  }

  const canSubmit = selectedIds.size > 0
    && (remainingCharacters === null || remainingCharacters >= 0)
    && (!!text.trim() || mediaDrafts.length > 0)
    && !submitting;

  const primaryMedia = mediaDrafts[0] ?? null;

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

    if (selectedIds.size === 0) {
      setError('Select at least one connected channel before posting.');
      return;
    }

    if (!text.trim() && mediaDrafts.length === 0) {
      setError('Add post copy or attach media before posting.');
      return;
    }

    if (remainingCharacters !== null && remainingCharacters < 0) {
      setError(`The post exceeds the character limit for one of the selected channels.`);
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

      // Post to all selected accounts, gather results
      const results = await Promise.allSettled(
        [...selectedIds].map((accountId) =>
          fetch(`/api/provider-accounts/${accountId}/posts`, { method: 'POST', body: formData.constructor === FormData ? (() => { const f = new FormData(); formData.forEach((v, k) => f.append(k, v)); return f; })() : formData }),
        ),
      );

      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      if (failures.length === results.length) {
        throw new Error('All posts failed to publish. Check your connections.');
      }
      if (failures.length > 0) {
        setSuccess(`Published to ${results.length - failures.length} of ${results.length} channels. ${failures.length} failed.`);
      } else {
        setSuccess(`Published to ${results.length} channel${results.length > 1 ? 's' : ''} successfully.`);
      }

      setTitle('');
      setText('');
      setMediaDrafts((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to publish post');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Create Post"
      description="Compose once, publish to every connected channel."
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
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px]">

        {/* ── Left: Compose ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Channel picker */}
          <SectionCard
            title="Channels"
            description="Select one or more connected accounts to publish to simultaneously."
          >
            {loadingAccounts ? (
              <p className="text-sm text-slate-400">Loading connected accounts…</p>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-500">No connected accounts yet.</p>
                <Link href="/integrations" className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Connect a channel →
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map((account) => {
                  const cfg = channelConfig(account.provider);
                  const isSelected = selectedIds.has(account.id);
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => toggleAccount(account.id)}
                      className={[
                        'flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition',
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <span className="text-[11px] font-bold leading-none">{cfg.icon}</span>
                      <span>{account.display_name || account.provider_username || cfg.label}</span>
                      <span className={[
                        'text-[10px] font-medium',
                        isSelected ? 'text-slate-300' : 'text-slate-400',
                      ].join(' ')}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
                <Link
                  href="/integrations"
                  className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition"
                >
                  + Add channel
                </Link>
              </div>
            )}
          </SectionCard>

          {/* Compose */}
          <SectionCard title="Compose" description="Write your post. The preview updates live for each selected channel.">
            <div className="space-y-6">
              <div className="inline-flex rounded-2xl border border-slate-300 p-1 text-sm font-medium">
                <span className="rounded-xl bg-slate-900 px-4 py-2 text-white">Write Post</span>
                <span className="rounded-xl px-4 py-2 text-slate-400">Generate with AI</span>
              </div>

              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

              {/* Textarea */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Post content
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={8}
                    placeholder="What would you like to share?"
                    className="mt-2 block w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-7 outline-none transition focus:border-slate-500"
                  />
                </label>

                {/* Counter + Posting Limit tooltip */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onMouseEnter={() => setShowLimitsTooltip(true)}
                      onMouseLeave={() => setShowLimitsTooltip(false)}
                      className="text-xs font-medium text-slate-400 underline decoration-slate-300 underline-offset-4 hover:text-slate-600 transition"
                    >
                      Posting limit
                    </button>
                    {showLimitsTooltip ? (
                      <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Character limits by platform</p>
                        <div className="space-y-2">
                          {POSTING_LIMITS.map((row) => (
                            <div key={row.platform} className="flex items-start justify-between gap-3">
                              <span className="text-sm font-medium text-slate-800">{row.platform}</span>
                              <div className="text-right">
                                <span className="block text-sm font-semibold text-slate-900">{row.limit}</span>
                                <span className="block text-[11px] text-slate-400">{row.note}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedAccounts.length > 0 && (
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <p className="text-[11px] text-slate-500">
                              Binding limit for your selection:{' '}
                              <strong className="text-slate-800">
                                {effectiveLimit !== null ? effectiveLimit.toLocaleString() : '—'} chars
                              </strong>
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {effectiveLimit !== null ? (
                    <span className={[
                      'text-xs font-medium',
                      remainingCharacters !== null && remainingCharacters < 0
                        ? 'text-rose-600'
                        : remainingCharacters !== null && remainingCharacters < 40
                          ? 'text-amber-600'
                          : 'text-slate-400',
                    ].join(' ')}>
                      {text.length.toLocaleString()} / {effectiveLimit.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">{text.length.toLocaleString()} chars</span>
                  )}
                </div>
              </div>

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

          {/* Media */}
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

          {/* Desktop submit bar */}
          <div className="hidden lg:block">
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting
                  ? 'Publishing…'
                  : selectedIds.size > 1
                    ? `Post to ${selectedIds.size} channels`
                    : 'Post Now'}
              </button>
              <button type="button" disabled className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-400">
                Schedule (next)
              </button>
              {selectedIds.size > 0 && (
                <div className="ml-auto flex flex-wrap gap-2">
                  {selectedAccounts.map((a) => {
                    const cfg = channelConfig(a.provider);
                    return (
                      <span key={a.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        {cfg.icon} {a.display_name || a.provider_username || cfg.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* ── Right: Preview ─────────────────────────────────────────────── */}
        <aside className="space-y-6 xl:sticky xl:top-5">

          {/* Preview channel tabs */}
          {selectedAccounts.length > 0 && (
            <SectionCard
              title="Preview"
              description={selectedAccounts.length > 1 ? 'Switch tabs to see how the post looks per channel.' : 'Live preview as you type.'}
            >
              {/* Tab row — only shown when 2+ channels selected */}
              {selectedAccounts.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedAccounts.map((a) => {
                    const cfg = channelConfig(a.provider);
                    const isActive = previewAccountId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setPreviewAccountId(a.id)}
                        className={[
                          'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition',
                          isActive
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <span>{cfg.icon}</span>
                        <span>{a.display_name || a.provider_username || cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Preview card */}
              {previewAccount ? (
                <PreviewCard
                  account={previewAccount}
                  title={title}
                  text={text}
                  primaryMedia={primaryMedia}
                />
              ) : (
                <p className="text-sm text-slate-400">Select a channel to see a preview.</p>
              )}
            </SectionCard>
          )}

          {/* Char-limit summary for selected channels */}
          {selectedAccounts.length > 1 && (
            <SectionCard title="Limits" description="Character headroom per selected channel.">
              <div className="space-y-3">
                {selectedAccounts.map((a) => {
                  const cfg = channelConfig(a.provider);
                  const remaining = cfg.charLimit - text.length;
                  const pct = Math.max(0, Math.min(100, (text.length / cfg.charLimit) * 100));
                  return (
                    <div key={a.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{cfg.icon} {cfg.label}</span>
                        <span className={remaining < 0 ? 'font-semibold text-rose-600' : remaining < 40 ? 'text-amber-600' : 'text-slate-400'}>
                          {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining.toLocaleString()} left`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={['h-full rounded-full transition-all', remaining < 0 ? 'bg-rose-500' : remaining < 40 ? 'bg-amber-400' : 'bg-emerald-500'].join(' ')}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* No channels selected yet */}
          {selectedAccounts.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm font-medium text-slate-600">Select a channel above</p>
              <p className="mt-1 text-sm text-slate-400">Your preview will appear here.</p>
            </div>
          )}

          {/* Manage connections */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Connections</p>
            <Link href="/integrations" className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Manage connected channels
            </Link>
          </div>
        </aside>
      </div>

      {/* Mobile sticky submit bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {selectedAccounts.length > 0
                ? selectedAccounts.map((a) => a.display_name || a.provider_username || channelConfig(a.provider).label).join(', ')
                : 'Select a channel'}
            </p>
            {effectiveLimit !== null ? (
              <p className="text-xs text-slate-500">{text.length.toLocaleString()} / {effectiveLimit.toLocaleString()} chars</p>
            ) : (
              <p className="text-xs text-slate-500">{text.length.toLocaleString()} chars</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => document.querySelector('form')?.requestSubmit()}
            disabled={!canSubmit}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Publishing…' : selectedIds.size > 1 ? `Post to ${selectedIds.size}` : 'Post Now'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

// ── Per-channel preview card ──────────────────────────────────────────────────
function PreviewCard({
  account,
  title,
  text,
  primaryMedia,
}: {
  account: ProviderAccountSummary;
  title: string;
  text: string;
  primaryMedia: MediaDraft | null;
}) {
  const cfg = channelConfig(account.provider);
  const displayName = account.display_name || 'Your Name';
  const username = account.provider_username;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
      {/* Platform badge */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-700">
            {cfg.icon}
          </span>
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-slate-950">{displayName}</p>
            {username ? <p className="text-[12px] text-slate-400">@{username}</p> : null}
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {cfg.label}
        </span>
      </div>

      {/* Content */}
      {(title || text) ? (
        <div className="space-y-2 text-[15px] leading-7 text-slate-700">
          {title ? <p className="font-medium text-slate-900">{title}</p> : null}
          {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
        </div>
      ) : (
        <p className="text-[15px] leading-7 text-slate-400">Your post preview will update as you type.</p>
      )}

      {/* Media */}
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

      {/* Footer engagement hint */}
      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-slate-300">
        <span className="text-xs">♡ Like</span>
        <span className="text-xs">💬 Comment</span>
        {account.provider === 'twitter' ? <span className="text-xs">🔁 Repost</span> : null}
        {account.provider === 'linkedin' ? <span className="text-xs">↗ Share</span> : null}
      </div>
    </div>
  );
}
