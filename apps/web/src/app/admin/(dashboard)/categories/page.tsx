'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader } from '@/components/admin/ui';

interface Category { id: string; name: string; slug: string; isActive: boolean; _count?: { products: number } }

export default function CategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Category[]>('/admin/categories').then(setRows).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/admin/categories', { name });
      setName('');
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  async function remove(id: string) {
    if (!confirm('Delete category?')) return;
    await api.delete(`/admin/categories/${id}`);
    await load();
  }

  return (
    <div>
      <PageHeader title="Categories" />
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <Card className="mb-4">
        <form onSubmit={add} className="flex gap-2">
          <div className="flex-1"><Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <Button type="submit">Add</Button>
        </form>
      </Card>
      <Card>
        <ul className="divide-y divide-slate-100">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span>{c.name} <span className="text-sm text-slate-400">({c._count?.products ?? 0} products)</span></span>
              <button onClick={() => remove(c.id)} className="text-sm text-red-500">Delete</button>
            </li>
          ))}
          {rows.length === 0 && <li className="py-6 text-center text-slate-400">No categories</li>}
        </ul>
      </Card>
    </div>
  );
}
