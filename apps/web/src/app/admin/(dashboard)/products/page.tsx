'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { Button, Card, Input, PageHeader, Select, Textarea } from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

interface Product {
  id: string;
  name: string;
  slug: string;
  priceMinor: number;
  salePriceMinor?: number | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  description?: string | null;
  category?: { id: string; name: string } | null;
  images?: { url: string }[];
}
interface Category { id: string; name: string }

const emptyForm = {
  name: '',
  priceMajor: '',
  salePriceMajor: '',
  stock: '0',
  sku: '',
  categoryId: '',
  description: '',
  isFeatured: false,
  isActive: true,
  images: [] as string[],
};

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [p, c] = await Promise.all([
      api.get<{ data: Product[] }>('/admin/products?pageSize=100'),
      api.get<Category[]>('/admin/categories'),
    ]);
    setRows(p.data);
    setCats(c);
  }
  useEffect(() => { load().catch((e) => setError((e as Error).message)); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      priceMinor: Math.round(parseFloat(form.priceMajor || '0') * 100),
      salePriceMinor: form.salePriceMajor ? Math.round(parseFloat(form.salePriceMajor) * 100) : null,
      stock: parseInt(form.stock || '0', 10),
      sku: form.sku || null,
      categoryId: form.categoryId || null,
      description: form.description || null,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      imageUrls: form.images,
      variants: [],
      addons: [],
    };
    try {
      if (editId) await api.patch(`/admin/products/${editId}`, payload);
      else await api.post('/admin/products', payload);
      setOpen(false);
      setForm({ ...emptyForm });
      setEditId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/admin/products/${id}`);
    await load();
  }

  function startEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name,
      priceMajor: (p.priceMinor / 100).toString(),
      salePriceMajor: p.salePriceMinor ? (p.salePriceMinor / 100).toString() : '',
      stock: p.stock.toString(),
      sku: '',
      categoryId: p.category?.id ?? '',
      description: p.description ?? '',
      isFeatured: p.isFeatured,
      isActive: p.isActive,
      images: p.images?.map((i) => i.url) ?? [],
    });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader title="Products" action={<Button onClick={() => { setEditId(null); setForm({ ...emptyForm }); setOpen(true); }}>Add product</Button>} />
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {open && (
        <Card className="mb-4">
          <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">— none —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Price" type="number" step="0.01" value={form.priceMajor} onChange={(e) => setForm({ ...form, priceMajor: e.target.value })} required />
            <Input label="Sale price (optional)" type="number" step="0.01" value={form.salePriceMajor} onChange={(e) => setForm({ ...form, salePriceMajor: e.target.value })} />
            <Input label="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <div className="md:col-span-2"><Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="md:col-span-2">
              <ImageUploader label="Product images" multiple recommended="800×800" value={form.images} onChange={(images) => setForm({ ...form, images })} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">{editId ? 'Update' : 'Create'}</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr><th className="py-2">Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="py-2 font-medium">{p.name}{p.isFeatured && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-700">★</span>}</td>
                <td>{p.category?.name ?? '—'}</td>
                <td>{formatMoney(p.salePriceMinor ?? p.priceMinor)}</td>
                <td>{p.stock}</td>
                <td>{p.isActive ? 'Active' : 'Inactive'}</td>
                <td className="flex gap-2 py-2">
                  <button onClick={() => startEdit(p)} className="text-emerald-600">Edit</button>
                  <button onClick={() => remove(p.id)} className="text-red-500">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No products yet</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
