'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

interface Report {
  stores: number;
  activeStores: number;
  staffUsers: number;
  customers: number;
  orders: number;
  gmvMinor: number;
  paidRevenueMinor: number;
}

export default function SystemOverview() {
  const [r, setR] = useState<Report | null>(null);
  useEffect(() => { api.get<Report>('/super/reports').then(setR).catch(() => undefined); }, []);
  if (!r) return <p className="text-slate-400">Loading…</p>;

  const cards = [
    { label: 'Stores', value: r.stores, href: '/system/stores' },
    { label: 'Active stores', value: r.activeStores, href: '/system/stores' },
    { label: 'Customers', value: r.customers, href: '/system/stores' },
    { label: 'Orders', value: r.orders, href: '/system/stores' },
    { label: 'GMV', value: formatMoney(r.gmvMinor), href: '/system/stores' },
    { label: 'Paid revenue', value: formatMoney(r.paidRevenueMinor), href: '/system/plans' },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Platform overview</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
          >
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { href: '/system/stores', label: 'Manage stores' },
          { href: '/system/users', label: 'Manage users' },
          { href: '/system/plans', label: 'Plans' },
          { href: '/system/domains', label: 'Domains' },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-medium text-slate-700 hover:border-slate-400 hover:shadow-sm">
            {q.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
