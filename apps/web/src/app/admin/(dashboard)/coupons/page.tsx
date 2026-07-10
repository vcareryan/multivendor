'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Select } from '@/components/admin/ui';

interface Coupon { id: string; code: string; discountType: string; value: number; minOrderMinor: number; isActive: boolean }

export default function CouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [form, setForm] = useState({ code: '', discountType: 'PERCENTAGE', value: '', minOrderMajor: '' });
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Coupon[]>('/admin/coupons').then(setRows).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/coupons', {
        code: form.code,
        discountType: form.discountType,
        value: form.discountType === 'PERCENTAGE' ? parseInt(form.value || '0', 10) : Math.round(parseFloat(form.value || '0') * 100),
        minOrderMinor: Math.round(parseFloat(form.minOrderMajor || '0') * 100),
      });
      setForm({ code: '', discountType: 'PERCENTAGE', value: '', minOrderMajor: '' });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  async function remove(id: string) { await api.delete(`/admin/coupons/${id}`); await load(); }

  return (
    <div>
      <PageHeader title="Coupons" />
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <Card className="mb-4">
        <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Select label="Type" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed</option>
          </Select>
          <Input label={form.discountType === 'PERCENTAGE' ? 'Value (%)' : 'Value (amount)'} type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
          <Input label="Min order" type="number" step="0.01" value={form.minOrderMajor} onChange={(e) => setForm({ ...form, minOrderMajor: e.target.value })} />
          <div className="md:col-span-4"><Button type="submit">Add coupon</Button></div>
        </form>
      </Card>
      <Card>
        <ul className="divide-y divide-slate-100">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span className="font-medium">{c.code}</span>
              <span className="text-sm text-slate-500">{c.discountType === 'PERCENTAGE' ? `${c.value}%` : `${(c.value / 100).toFixed(2)}`}</span>
              <button onClick={() => remove(c.id)} className="text-sm text-red-500">Delete</button>
            </li>
          ))}
          {rows.length === 0 && <li className="py-6 text-center text-slate-400">No coupons</li>}
        </ul>
      </Card>
    </div>
  );
}
