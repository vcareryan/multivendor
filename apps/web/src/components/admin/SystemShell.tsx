'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';

const NAV = [
  { href: '/system', label: 'Overview' },
  { href: '/system/stores', label: 'Stores' },
  { href: '/system/users', label: 'Users' },
  { href: '/system/plans', label: 'Plans' },
  { href: '/system/domains', label: 'Domains' },
];

export function SystemShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .get<{ role: string }>('/auth/me')
      .then((u) => {
        if (u.role !== 'SUPER_ADMIN') router.replace('/admin/login');
        else setReady(true);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/admin/login');
        else setReady(true);
      });
  }, [router]);

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-900 text-slate-100 md:block">
        <div className="p-4 text-lg font-semibold">UtanStore · Platform</div>
        <nav className="flex flex-col gap-0.5 px-2 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-2 ${pathname === n.href ? 'bg-slate-700 font-medium' : 'text-slate-300 hover:bg-slate-800'}`}>
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
