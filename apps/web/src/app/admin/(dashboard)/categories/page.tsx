'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader } from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  imageUrl?: string | null;
  _count?: { products: number };
}

export default function CategoriesPage() {
  const [rows, setRows] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [image, setImage] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Category[]>('/admin/categories').then(setRows).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/admin/categories', { name, imageUrl: image[0] ?? null });
      setName('');
      setImage([]);
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  async function setCategoryImage(id: string, url: string | null) {
    await api.patch(`/admin/categories/${id}`, { imageUrl: url }).catch((e) => setError((e as Error).message));
    await load();
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
      <Card className="mb-4 space-y-3">
        <form onSubmit={add} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1"><Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <Button type="submit">Add</Button>
          </div>
          <ImageUploader label="Category image (optional)" value={image} onChange={setImage} />
        </form>
      </Card>
      <Card>
        <ul className="divide-y divide-slate-100">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-3">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-slate-400">{c.name.charAt(0)}</span>
                )}
                <span>{c.name} <span className="text-sm text-slate-400">({c._count?.products ?? 0} products)</span></span>
              </div>
              <div className="flex items-center gap-3">
                <ImageUploader value={c.imageUrl ? [c.imageUrl] : []} onChange={(urls) => setCategoryImage(c.id, urls[0] ?? null)} />
                <button onClick={() => remove(c.id)} className="text-sm text-red-500">Delete</button>
              </div>
            </li>
          ))}
          {rows.length === 0 && <li className="py-6 text-center text-slate-400">No categories</li>}
        </ul>
      </Card>
    </div>
  );
}
