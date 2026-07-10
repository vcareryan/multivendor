'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Select } from '@/components/admin/ui';
import { INDUSTRY_LABELS } from '@utanstore/shared';

interface Store { id: string; name: string; slug: string; status: string; industry: string; subscription?: { plan: { tier: string } } | null; _count?: { products: number; orders: number } }

export default function SystemStoresPage() {
  const [rows, setRows] = useState<Store[]>([]);
  const [form, setForm] = useState({ name: '', industry: 'GROCERY', ownerName: '', ownerEmail: '', ownerPassword: '', whatsappNumber: '' });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<{ data: Store[] }>('/super/stores?pageSize=100').then((r) => setRows(r.data)).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/super/stores', form);
      setOpen(false);
      setForm({ name: '', industry: 'GROCERY', ownerName: '', ownerEmail: '', ownerPassword: '', whatsappNumber: '' });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  async function setStatus(id: string, status: string) { await api.put(`/super/stores/${id}/status`, { status }); await load(); }

  return (
    <div>
      <PageHeader title="Stores" action={<Button onClick={() => setOpen(!open)}>New store</Button>} />
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      {open && (
        <Card className="mb-4">
          <form onSubmit={create} className="grid gap-3 md:grid-cols-2">
            <Input label="Store name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select label="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
              {Object.entries(INDUSTRY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Input label="Owner name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required />
            <Input label="Owner email" type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} required />
            <Input label="Owner password" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} required />
            <Input label="WhatsApp number" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
            <div className="md:col-span-2"><Button type="submit">Create store</Button></div>
          </form>
        </Card>
      )}
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Store</th><th>Industry</th><th>Plan</th><th>Products</th><th>Orders</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="py-2 font-medium">{s.name}<br /><span className="text-xs text-slate-400">{s.slug}.utanstore.com</span></td>
                <td>{s.industry}</td>
                <td>{s.subscription?.plan.tier ?? '—'}</td>
                <td>{s._count?.products ?? 0}</td>
                <td>{s._count?.orders ?? 0}</td>
                <td>
                  <select value={s.status} onChange={(e) => setStatus(s.id, e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm">
                    {['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_SETUP'].map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No stores</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
