'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Card, Input, PageHeader } from '@/components/admin/ui';

interface Customer { id: string; name?: string | null; phone: string; email?: string | null; _count?: { orders: number } }

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  const load = (q = '') => api.get<{ data: Customer[] }>(`/admin/customers?pageSize=100${q ? `&search=${encodeURIComponent(q)}` : ''}`).then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="Customers" />
      <Card className="mb-4"><Input placeholder="Search name or phone" value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value); }} /></Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Name</th><th>Phone</th><th>Email</th><th>Orders</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="py-2">{c.name ?? '—'}</td><td>{c.phone}</td><td>{c.email ?? '—'}</td><td>{c._count?.orders ?? 0}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No customers</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
