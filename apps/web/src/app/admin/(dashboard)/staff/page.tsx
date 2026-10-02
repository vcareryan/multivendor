'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Select } from '@/components/admin/ui';

interface Staff { id: string; name: string; email: string; role: string; isActive: boolean }

export default function StaffPage() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [form, setForm] = useState({ name: '', email: '', role: 'STAFF', password: '' });
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Staff[]>('/admin/staff').then(setRows).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/staff', form);
      setForm({ name: '', email: '', role: 'STAFF', password: '' });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Staff" />
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <Card className="mb-4">
        <form onSubmit={invite} className="grid gap-3 md:grid-cols-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="STAFF">Staff</option>
            <option value="STORE_MANAGER">Manager</option>
          </Select>
          <Input label="Temp password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <div className="md:col-span-4"><Button type="submit">Add staff</Button></div>
        </form>
      </Card>
      <Card>
        <ul className="divide-y divide-slate-100">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span>{s.name} <span className="text-sm text-slate-400">{s.email}</span></span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{s.role}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
