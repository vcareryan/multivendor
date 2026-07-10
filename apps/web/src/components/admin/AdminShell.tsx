'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/delivery', label: 'Delivery areas' },
  { href: '/admin/staff', label: 'Staff' },
  { href: '/admin/settings/store', label: 'Store settings' },
  { href: '/admin/settings/checkout', label: 'Checkout' },
  { href: '/admin/settings/payments', label: 'Payments' },
  { href: '/admin/settings/customer-auth', label: 'Customer verification' },
  { href: '/admin/settings/theme', label: 'Theme' },
  { href: '/admin/settings/seo', label: 'SEO & Google' },
  { href: '/admin/settings/domain', label: 'Domain' },
  { href: '/admin/settings/subscription', label: 'Subscription' },
  { href: '/admin/account', label: 'My account' },
];

interface Me {
  id: string;
  email: string;
  role: string;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  // Auth check runs in the BACKGROUND — the shell renders immediately so the
  // panel feels instant (no full-screen "Loading…" gate). We only redirect if
  // the session is actually invalid.
  useEffect(() => {
    api
      .get<Me>('/auth/me')
      .then(setMe)
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
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="p-4 text-lg font-semibold text-emerald-700">Admin Panel</div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              prefetch
              href={n.href}
              className={`rounded-lg px-3 py-2 ${pathname === n.href ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-4 py-3 text-[11px] leading-tight text-slate-400">
          Developed By Income inn Technologies
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Link href="/admin/account" className="text-sm text-slate-500 hover:text-emerald-700">
            {me?.email ?? 'My account'}
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
