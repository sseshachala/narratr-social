'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/integrations', label: 'Integrations' },
  { href: '/posts', label: 'Posts' },
  { href: '/posts/create', label: 'Create Post' },
];

function isActive(pathname: string, href: string) {
  if (href === '/posts') return pathname === '/posts';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Narratr Social</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">Workspace</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Manage social connections, recent posts, and content creation.</p>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition',
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
                {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
            </div>
          </header>

          <main className="mt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
