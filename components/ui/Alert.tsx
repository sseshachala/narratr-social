import type { ReactNode } from 'react';

type AlertVariant = 'error' | 'warning' | 'success' | 'info';

const styles: Record<AlertVariant, string> = {
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function Alert({ variant, title, children, dismissible = false, onDismiss }: { variant: AlertVariant; title?: string; children: ReactNode; dismissible?: boolean; onDismiss?: () => void; }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${styles[variant]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {title ? <p className="font-semibold">{title}</p> : null}
          <div className={title ? 'mt-1' : ''}>{children}</div>
        </div>
        {dismissible ? (
          <button type="button" onClick={onDismiss} className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-current/70 transition hover:bg-white/60 hover:text-current" aria-label="Dismiss">
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
