'use client';

import { SectionCard } from '@/components/ui/SectionCard';

export function ContentPanel({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: Array<{ id: string; text?: string | null; createdAt?: string | null }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <SectionCard title={title} description="Review fetched content and pick one item when you want post-level analytics.">
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-500">No content available yet.</p>}
        {items.map((item) => (
          <label key={item.id} className="flex justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300">
            <div className="max-w-3xl">
              <div className="line-clamp-2 text-sm leading-6 text-slate-800">{item.text || '(No text)'}</div>
              <div className="mt-1 text-xs text-slate-500">{item.createdAt || item.id}</div>
            </div>
            <input type="radio" checked={selectedId === item.id} onChange={() => onSelect(item.id)} />
          </label>
        ))}
      </div>
    </SectionCard>
  );
}
