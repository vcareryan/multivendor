'use client';

import { useEffect, useState } from 'react';
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
    { label: 'Stores', value: r.stores },
    { label: 'Active stores', value: r.activeStores },
    { label: 'Customers', value: r.customers },
    { label: 'Orders', value: r.orders },
    { label: 'GMV', value: formatMoney(r.gmvMinor) },
    { label: 'Paid revenue', value: formatMoney(r.paidRevenueMinor) },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Platform overview</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
