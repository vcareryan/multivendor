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
  const [navOpen, setNavOpen] = useState(false);

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

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    router.replace('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay — dims the page behind the drawer */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          aria-hidden="true"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Sidebar: static on desktop, slide-in drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 transform flex-col border-r border-slate-200 bg-slate-900 text-slate-100 transition-transform duration-200 ease-in-out md:static md:z-auto md:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <span className="text-lg font-semibold">UtanStore · Platform</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
            className="rounded-lg p-1 text-slate-300 hover:bg-slate-800 md:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4 text-sm">
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
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
              className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 md:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link href="/system/account" className="text-sm text-slate-500 hover:text-slate-900">
              {me?.email ?? 'Platform admin'}
            </Link>
          </div>
          <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Logout
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
