'use client';

import { useEffect, useState } from 'react';
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
    { label: 'Revenue (30d)', value: formatMoney(s.revenueMinor) },
    { label: 'Paid online (30d)', value: formatMoney(s.paidRevenueMinor) },
    { label: 'Orders (30d)', value: s.recentOrders },
    { label: 'Total orders', value: s.totalOrders },
    { label: 'Customers', value: s.customers },
    { label: 'Low stock', value: s.lowStockCount },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Orders by status</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(s.ordersByStatus).map(([status, n]) => (
            <span key={status} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{status}: {n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
