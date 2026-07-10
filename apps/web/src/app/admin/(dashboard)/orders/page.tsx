'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { Card, PageHeader } from '@/components/admin/ui';

const STATUSES = ['NEW', 'WHATSAPP_SENT', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  channel: string;
  status: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
  payment?: { status: string } | null;
}

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api.get<{ data: Order[] }>(`/admin/orders?pageSize=100${filter ? `&status=${filter}` : ''}`).then((r) => setRows(r.data)).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function setStatus(id: string, status: string) {
    await api.patch(`/admin/orders/${id}/status`, { status });
    await load();
  }

  return (
    <div>
      <PageHeader title="Orders" />
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={`rounded-full px-3 py-1 text-sm ${filter === '' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>All</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-sm ${filter === s ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>{s}</button>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Order</th><th>Customer</th><th>Channel</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="py-2 font-medium">#{o.orderNumber}</td>
                <td>{o.customerName}<br /><span className="text-xs text-slate-400">{o.customerPhone}</span></td>
                <td>{o.channel}</td>
                <td>{formatMoney(o.totalMinor, o.currency)}</td>
                <td>{o.payment?.status ?? '—'}</td>
                <td>
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No orders</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
