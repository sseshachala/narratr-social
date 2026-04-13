'use client';

import { Facebook, Instagram, Twitter } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import type { ProviderId } from '@/types';

const icons = { facebook: Facebook, instagram: Instagram, twitter: Twitter };

export function ProviderCard({
  provider,
  title,
  description,
  connected,
  disabled,
  onConnect,
  onDisconnect,
}: {
  provider: ProviderId;
  title: string;
  description: string;
  connected?: boolean;
  disabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}) {
  const Icon = icons[provider];

  return (
    <SectionCard
      title={title}
      description={description}
      actions={disabled ? (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Phase 2</span>
      ) : connected ? (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">Connected</span>
      ) : (
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">Not connected</span>
      )}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3"><Icon className="h-6 w-6" /></div>
        <div className="flex gap-3">
          {!disabled && !connected && <button onClick={onConnect} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Connect</button>}
          {!disabled && connected && <button onClick={onDisconnect} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700">Disconnect</button>}
        </div>
      </div>
    </SectionCard>
  );
}
