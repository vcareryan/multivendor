'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { Button, Card, Input, PageHeader } from '@/components/admin/ui';

interface Area { id: string; name: string; pincode?: string | null; feeMinor: number; minOrderMinor: number; isActive: boolean }

export default function DeliveryPage() {
  const [rows, setRows] = useState<Area[]>([]);
  const [form, setForm] = useState({ name: '', pincode: '', feeMajor: '', minOrderMajor: '' });
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Area[]>('/admin/delivery-areas').then(setRows).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/admin/delivery-areas', {
        name: form.name,
        pincode: form.pincode || null,
        feeMinor: Math.round(parseFloat(form.feeMajor || '0') * 100),
        minOrderMinor: Math.round(parseFloat(form.minOrderMajor || '0') * 100),
      });
      setForm({ name: '', pincode: '', feeMajor: '', minOrderMajor: '' });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  async function remove(id: string) { await api.delete(`/admin/delivery-areas/${id}`); await load(); }

  return (
    <div>
      <PageHeader title="Delivery areas" />
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <Card className="mb-4">
        <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
          <Input label="Area name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          <Input label="Delivery fee" type="number" step="0.01" value={form.feeMajor} onChange={(e) => setForm({ ...form, feeMajor: e.target.value })} />
          <Input label="Min order" type="number" step="0.01" value={form.minOrderMajor} onChange={(e) => setForm({ ...form, minOrderMajor: e.target.value })} />
          <div className="md:col-span-4"><Button type="submit">Add area</Button></div>
        </form>
      </Card>
      <Card>
        <ul className="divide-y divide-slate-100">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <span>{a.name} {a.pincode && <span className="text-sm text-slate-400">({a.pincode})</span>}</span>
              <span className="text-sm text-slate-500">Fee {formatMoney(a.feeMinor)} · Min {formatMoney(a.minOrderMinor)}</span>
              <button onClick={() => remove(a.id)} className="text-sm text-red-500">Delete</button>
            </li>
          ))}
          {rows.length === 0 && <li className="py-6 text-center text-slate-400">No delivery areas</li>}
        </ul>
      </Card>
    </div>
  );
}
