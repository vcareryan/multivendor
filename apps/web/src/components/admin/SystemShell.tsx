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
  { href: '/system/account', label: 'My account' },
];

interface Me {
  email: string;
  role: string;
}

export function SystemShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  // Background auth check — shell renders immediately; redirect only if the
  // session is invalid or the user isn't a platform admin.
  useEffect(() => {
    api
      .get<Me>('/auth/me')
      .then((u) => {
        if (u.role !== 'SUPER_ADMIN') router.replace('/admin/login');
        else setMe(u);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/admin/login');
      });
  }, [router]);

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    router.replace('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 md:flex">
        <div className="p-4 text-lg font-semibold">UtanStore · Platform</div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              prefetch
              href={n.href}
              className={`rounded-lg px-3 py-2 ${pathname === n.href ? 'bg-slate-700 font-medium' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-4 py-3 text-[11px] leading-tight text-slate-500">
          Developed By Income inn Technologies
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Link href="/system/account" className="text-sm text-slate-500 hover:text-slate-900">
            {me?.email ?? 'Platform admin'}
          </Link>
          <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Logout
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
