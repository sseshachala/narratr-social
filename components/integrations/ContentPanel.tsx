'use client';

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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-500">No content available yet.</p>}
        {items.map((item) => (
          <label key={item.id} className="flex justify-between rounded-xl border border-slate-200 p-4">
            <div className="max-w-xl">
              <div className="line-clamp-2 text-sm text-slate-800">{item.text || '(No text)'}</div>
              <div className="mt-1 text-xs text-slate-500">{item.createdAt || item.id}</div>
            </div>
            <input type="radio" checked={selectedId === item.id} onChange={() => onSelect(item.id)} />
          </label>
        ))}
      </div>
    </div>
  );
}
