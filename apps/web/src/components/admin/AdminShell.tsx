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
  { href: '/admin/settings/domain', label: 'Domain' },
  { href: '/admin/settings/subscription', label: 'Subscription' },
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .get<Me>('/auth/me')
      .then((u) => {
        setMe(u);
        setReady(true);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace('/admin/login');
        else setReady(true);
      });
  }, [router]);

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    router.replace('/admin/login');
  }

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="p-4 text-lg font-semibold text-emerald-700">UtanStore Admin</div>
        <nav className="flex flex-col gap-0.5 px-2 pb-4 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-2 ${pathname === n.href ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <span className="text-sm text-slate-500">{me?.email}</span>
          <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Logout</button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
