'use client';

import { SectionCard } from '@/components/ui/SectionCard';
import type { IntegrationAsset } from '@/types';

export function AssetsPanel({
  title,
  assets,
  onSelect,
}: {
  title: string;
  assets: IntegrationAsset[];
  onSelect?: (assetId: string) => void;
}) {
  return (
    <SectionCard title={title} description="Select the connected asset or confirm which profile is active for this brand.">
      <div className="space-y-3">
        {assets.length === 0 && <p className="text-sm text-slate-500">No assets found yet.</p>}
        {assets.map((asset) => (
          <label key={asset.asset_id} className="flex justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300">
            <div>
              <div className="font-medium text-slate-900">{asset.asset_name}</div>
              <div className="mt-1 text-xs text-slate-500">{asset.asset_type} · {asset.asset_id}</div>
              {asset.ig_business_account_id && (
                <div className="mt-2 text-xs text-slate-600">Linked Instagram: {asset.ig_business_account_name || asset.ig_business_account_id}</div>
              )}
            </div>
            {onSelect ? (
              <input type="radio" checked={asset.selected} onChange={() => onSelect(asset.asset_id)} />
            ) : (
              <span className="self-start text-xs text-slate-500">{asset.selected ? 'Selected' : ''}</span>
            )}
          </label>
        ))}
      </div>
    </SectionCard>
  );
}
