'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

interface Summary {
  revenueMinor: number;
  paidRevenueMinor: number;
  totalOrders: number;
  recentOrders: number;
  deliveredOrders: number;
  customers: number;
  lowStockCount: number;
  ordersByStatus: Record<string, number>;
}

export default function DashboardPage() {
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<Summary>('/admin/reports/summary').then(setS).catch((e) => setErr((e as Error).message));
  }, []);

  if (err) return <p className="text-slate-500">Reports unavailable: {err}</p>;
  if (!s) return <p className="text-slate-400">Loading…</p>;

  const cards = [
    { label: 'Revenue (30d)', value: formatMoney(s.revenueMinor), href: '/admin/orders' },
    { label: 'Paid online (30d)', value: formatMoney(s.paidRevenueMinor), href: '/admin/orders' },
    { label: 'Orders (30d)', value: s.recentOrders, href: '/admin/orders' },
    { label: 'Total orders', value: s.totalOrders, href: '/admin/orders' },
    { label: 'Customers', value: s.customers, href: '/admin/customers' },
    { label: 'Low stock', value: s.lowStockCount, href: '/admin/products' },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-sm"
          >
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Orders by status</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(s.ordersByStatus).map(([status, n]) => (
            <Link
              key={status}
              href="/admin/orders"
              className="rounded-full bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
            >
              {status}: {n}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
