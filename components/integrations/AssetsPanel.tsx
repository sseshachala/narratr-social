'use client';

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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {assets.length === 0 && <p className="text-sm text-slate-500">No assets found yet.</p>}
        {assets.map((asset) => (
          <label key={asset.asset_id} className="flex justify-between rounded-xl border border-slate-200 p-4">
            <div>
              <div className="font-medium">{asset.asset_name}</div>
              <div className="mt-1 text-xs text-slate-500">{asset.asset_type} · {asset.asset_id}</div>
              {asset.ig_business_account_id && (
                <div className="mt-2 text-xs text-slate-600">Linked Instagram: {asset.ig_business_account_name || asset.ig_business_account_id}</div>
              )}
            </div>
            {onSelect ? (
              <input type="radio" checked={asset.selected} onChange={() => onSelect(asset.asset_id)} />
            ) : (
              <span className="text-xs text-slate-500 self-start">{asset.selected ? 'Selected' : ''}</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
