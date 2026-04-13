'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProviderCard } from '@/components/integrations/ProviderCard';
import { AssetsPanel } from '@/components/integrations/AssetsPanel';
import { ContentPanel } from '@/components/integrations/ContentPanel';
import { AnalyticsPanel } from '@/components/integrations/AnalyticsPanel';
import { SectionCard } from '@/components/ui/SectionCard';
import type { IntegrationAsset, ProviderId } from '@/types';

type ProviderState = {
  connected: boolean;
  assets: IntegrationAsset[];
  content: Array<{ id: string; text?: string | null; createdAt?: string | null }>;
  selectedAssetId: string;
  selectedContentId: string;
  analytics: Record<string, number | string> | null;
  loadingContent: boolean;
};

const defaultState: ProviderState = {
  connected: false,
  assets: [],
  content: [],
  selectedAssetId: '',
  selectedContentId: '',
  analytics: null,
  loadingContent: false,
};

export default function IntegrationsPage() {
  const [state, setState] = useState<Record<ProviderId, ProviderState>>({
    facebook: { ...defaultState },
    instagram: { ...defaultState },
    twitter: { ...defaultState },
  });
  const [error, setError] = useState('');
  const providerInfo = useMemo(() => ({
    facebook: { title: 'Facebook', description: 'Connect Pages, select a Page, and analyze posts.' },
    instagram: { title: 'Instagram', description: 'Business account flow comes in Phase 2.' },
    twitter: { title: 'Twitter / X', description: 'Connect Twitter, list posts, and publish content with media.' },
  }), []);

  async function loadStatus(provider: 'facebook' | 'twitter') {
    const res = await fetch(`/api/integrations/${provider}/status`, { cache: 'no-store' });
    const json = await res.json();
    setState((prev) => ({ ...prev, [provider]: { ...prev[provider], connected: !!json.connected } }));
  }

  async function loadAssets(provider: 'facebook' | 'twitter') {
    const res = await fetch(`/api/integrations/${provider}/assets`, { cache: 'no-store' });
    const json = await res.json();
    const assets = json.assets || [];
    const selected = assets.find((item: IntegrationAsset) => item.selected);
    setState((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        assets,
        selectedAssetId: selected?.asset_id || assets[0]?.asset_id || '',
      },
    }));
  }

  async function loadContent(provider: 'facebook' | 'twitter') {
    setState((prev) => ({ ...prev, [provider]: { ...prev[provider], loadingContent: true } }));
    try {
      const res = await fetch(`/api/integrations/${provider}/content`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to load ${provider} content`);
      const items = provider === 'facebook'
        ? (json.content || []).map((item: { id: string; message?: string; created_time?: string }) => ({ id: item.id, text: item.message, createdAt: item.created_time }))
        : (json.content || []).map((item: { id: string; text?: string; created_at?: string }) => ({ id: item.id, text: item.text, createdAt: item.created_at }));
      setState((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          content: items,
          selectedContentId: items[0]?.id || '',
          loadingContent: false,
        },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load content');
      setState((prev) => ({ ...prev, [provider]: { ...prev[provider], loadingContent: false } }));
    }
  }

  useEffect(() => {
    void loadStatus('facebook');
    void loadStatus('twitter');
    void loadAssets('facebook');
    void loadAssets('twitter');
  }, []);

  useEffect(() => {
    if (state.facebook.connected && state.facebook.assets.length > 0) void loadContent('facebook');
  }, [state.facebook.connected, state.facebook.assets.length]);

  useEffect(() => {
    if (state.twitter.connected && state.twitter.assets.length > 0) void loadContent('twitter');
  }, [state.twitter.connected, state.twitter.assets.length]);

  async function disconnect(provider: 'facebook' | 'twitter') {
    const res = await fetch(`/api/integrations/${provider}/disconnect`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) return setError(json.error || `Failed to disconnect ${provider}`);
    setState((prev) => ({ ...prev, [provider]: { ...defaultState } }));
  }

  async function selectFacebookAsset(assetId: string) {
    const res = await fetch('/api/integrations/facebook/select-asset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId }),
    });
    const json = await res.json();
    if (!res.ok) return setError(json.error || 'Failed to select Facebook page');
    await loadAssets('facebook');
    await loadContent('facebook');
  }

  async function fetchAnalytics(provider: 'facebook' | 'twitter', mode: 'range' | 'content') {
    const body = provider === 'facebook'
      ? mode === 'range'
        ? { mode: 'range', fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), toDate: new Date().toISOString().slice(0, 10) }
        : { mode: 'content', contentId: state.facebook.selectedContentId }
      : mode === 'range'
        ? { mode: 'range' }
        : { mode: 'content', contentId: state.twitter.selectedContentId };

    const res = await fetch(`/api/integrations/${provider}/analytics`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return setError(json.error || `Failed to fetch ${provider} analytics`);
    setState((prev) => ({ ...prev, [provider]: { ...prev[provider], analytics: json } }));
  }

  return (
    <AppShell
      title="Integrations"
      description="Connect your social accounts, verify which profiles are linked to the current brand, and jump into the posts workspace once X is connected."
      actions={
        state.twitter.connected ? (
          <div className="flex gap-3">
            <Link href="/posts" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              View Posts
            </Link>
            <Link href="/posts/create" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
              Create Post
            </Link>
          </div>
        ) : null
      }
    >
      <div className="space-y-6">
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <SectionCard title="Connected channels" description="Keep each provider in the same card system used across the workspace so connections, analytics, and content feel part of one flow.">
          <div className="grid gap-6 xl:grid-cols-3">
            <ProviderCard provider="facebook" title={providerInfo.facebook.title} description={providerInfo.facebook.description} connected={state.facebook.connected} onConnect={() => { window.location.href = '/api/integrations/facebook/start'; }} onDisconnect={() => void disconnect('facebook')} />
            <ProviderCard provider="instagram" title={providerInfo.instagram.title} description={providerInfo.instagram.description} disabled />
            <ProviderCard provider="twitter" title={providerInfo.twitter.title} description={providerInfo.twitter.description} connected={state.twitter.connected} onConnect={() => { window.location.href = '/api/integrations/twitter/start'; }} onDisconnect={() => void disconnect('twitter')} />
          </div>
        </SectionCard>

        {state.facebook.connected && (
          <div className="space-y-4">
            <AssetsPanel title="Facebook Pages" assets={state.facebook.assets} onSelect={selectFacebookAsset} />
            <SectionCard title="Facebook analytics actions" description="Run a range query or inspect a selected post with the same workspace styling used on Posts and Create Post.">
              <div className="flex flex-wrap gap-3">
                <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => void fetchAnalytics('facebook', 'range')}>Facebook 30-day analytics</button>
                <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => void fetchAnalytics('facebook', 'content')}>Selected post analytics</button>
              </div>
            </SectionCard>
            <ContentPanel title="Facebook Posts" items={state.facebook.content} selectedId={state.facebook.selectedContentId} onSelect={(id) => setState((prev) => ({ ...prev, facebook: { ...prev.facebook, selectedContentId: id } }))} />
            <AnalyticsPanel results={state.facebook.analytics} />
          </div>
        )}

        {state.twitter.connected && (
          <div className="space-y-4">
            <AssetsPanel title="Twitter Profiles" assets={state.twitter.assets} />
            <SectionCard title="Twitter analytics actions" description="Use these actions to compare account-level metrics with a specific tweet in a consistent card layout.">
              <div className="flex flex-wrap gap-3">
                <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => void fetchAnalytics('twitter', 'range')}>Twitter account analytics</button>
                <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => void fetchAnalytics('twitter', 'content')}>Selected tweet analytics</button>
              </div>
            </SectionCard>
            <ContentPanel title="Tweets" items={state.twitter.content} selectedId={state.twitter.selectedContentId} onSelect={(id) => setState((prev) => ({ ...prev, twitter: { ...prev.twitter, selectedContentId: id } }))} />
            <AnalyticsPanel results={state.twitter.analytics} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
