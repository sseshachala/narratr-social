'use client';

export function AnalyticsPanel({ results }: { results: Record<string, number | string> | null }) {
  if (!results) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Analytics</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(results).map(([key, value]) => (
          <div key={key} className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs uppercase text-slate-500">{key}</div>
            <div className="mt-2 text-2xl font-semibold">{String(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
