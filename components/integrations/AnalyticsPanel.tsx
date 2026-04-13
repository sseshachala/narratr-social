'use client';

import { SectionCard } from '@/components/ui/SectionCard';

export function AnalyticsPanel({ results }: { results: Record<string, number | string> | null }) {
  if (!results) return null;
  return (
    <SectionCard title="Analytics" description="These metrics come from the selected provider and update after each fetch.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(results).map(([key, value]) => (
          <div key={key} className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{key}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{String(value)}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
