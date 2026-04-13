'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Toast = { id: string; title: string; variant: 'success' | 'error' | 'info' };
type ToastContextValue = { pushToast: (toast: Omit<Toast, 'id'>) => void };
const ToastContext = createContext<ToastContextValue | null>(null);
const styles: Record<Toast['variant'], string> = {
  success: 'border-emerald-200 bg-white text-slate-900',
  error: 'border-rose-200 bg-white text-slate-900',
  info: 'border-slate-200 bg-white text-slate-900',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);
  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto rounded-2xl border p-4 shadow-lg ${styles[toast.variant]}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{toast.title}</p>
              <button type="button" onClick={() => removeToast(toast.id)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" aria-label="Dismiss">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
