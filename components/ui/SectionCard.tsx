import type { ReactNode } from 'react';

export function SectionCard({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={['rounded-3xl border border-slate-200 bg-white shadow-sm', className].join(' ')}>
      {(title || description || actions) ? (
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      ) : null}
      <div className={[title || description || actions ? 'px-6 py-5' : 'p-6', bodyClassName].join(' ')}>{children}</div>
    </section>
  );
}
