'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { Button, Card, Input, PageHeader, Select, Textarea } from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

interface Variant {
  id: string;
  name: string;
  label: string;
  sku?: string | null;
  priceMinor: number;
  salePriceMinor?: number | null;
  stock: number;
  isActive: boolean;
}
interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  priceMinor: number;
  salePriceMinor?: number | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  description?: string | null;
  category?: { id: string; name: string } | null;
  images?: { url: string }[];
  variants?: Variant[];
}
interface Category { id: string; name: string }

/** One editable row in the variant table (prices kept as typed strings). */
interface VariantRow {
  id?: string;
  label: string;
  priceMajor: string;
  salePriceMajor: string;
  stock: string;
  sku: string;
  isActive: boolean;
}

const emptyRow = (): VariantRow => ({ label: '', priceMajor: '', salePriceMajor: '', stock: '0', sku: '', isActive: true });

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
  hasVariants: false,
  optionName: 'Size',
  variants: [] as VariantRow[],
};

const toMinor = (major: string) => Math.round(parseFloat(major || '0') * 100);
const toMajor = (minor: number) => (minor / 100).toString();

/** Shows "₹199" or "₹199 – ₹499" for variant products. */
function priceRange(p: Product): string {
  const active = (p.variants ?? []).filter((v) => v.isActive);
  if (!active.length) return formatMoney(p.salePriceMinor ?? p.priceMinor);
  const prices = active.map((v) => v.salePriceMinor ?? v.priceMinor);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

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

  function setRow(i: number, patch: Partial<VariantRow>) {
    setForm((f) => ({ ...f, variants: f.variants.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  }
  function moveRow(i: number, dir: -1 | 1) {
    setForm((f) => {
      const j = i + dir;
      if (j < 0 || j >= f.variants.length) return f;
      const next = [...f.variants];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, variants: next };
    });
  }

  /** Returns an error message, or null if the variant table is valid. */
  function validateVariants(): string | null {
    if (!form.optionName.trim()) return 'Enter an option name (e.g. Size, Weight, Color).';
    if (form.variants.length === 0) return 'Add at least one option, or turn off "different prices".';
    const labels = new Set<string>();
    for (const [i, r] of form.variants.entries()) {
      const n = i + 1;
      if (!r.label.trim()) return `Option ${n}: enter a value (e.g. M, 500g).`;
      const key = r.label.trim().toLowerCase();
      if (labels.has(key)) return `Option "${r.label}" is listed twice.`;
      labels.add(key);
      if (!r.priceMajor || parseFloat(r.priceMajor) < 0) return `Option "${r.label}": enter a price.`;
      if (r.salePriceMajor && toMinor(r.salePriceMajor) >= toMinor(r.priceMajor)) {
        return `Option "${r.label}": sale price must be lower than the price.`;
      }
    }
    if (!form.variants.some((r) => r.isActive)) return 'At least one option must be active.';
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let variants: object[] = [];
    if (form.hasVariants) {
      const msg = validateVariants();
      if (msg) return setError(msg);
      variants = form.variants.map((r, i) => ({
        ...(r.id ? { id: r.id } : {}),
        name: form.optionName.trim(),
        label: r.label.trim(),
        sku: r.sku.trim() || null,
        priceMinor: toMinor(r.priceMajor),
        salePriceMinor: r.salePriceMajor ? toMinor(r.salePriceMajor) : null,
        stock: parseInt(r.stock || '0', 10),
        isActive: r.isActive,
        position: i,
      }));
    }

    // With variants, the product-level price/stock are derived on the server
    // from the cheapest option; we still send a valid placeholder.
    const firstVariant = variants[0] as { priceMinor: number } | undefined;
    const payload = {
      name: form.name,
      priceMinor: form.hasVariants ? firstVariant?.priceMinor ?? 0 : toMinor(form.priceMajor),
      salePriceMinor: form.hasVariants ? null : form.salePriceMajor ? toMinor(form.salePriceMajor) : null,
      stock: form.hasVariants ? 0 : parseInt(form.stock || '0', 10),
      sku: form.sku || null,
      categoryId: form.categoryId || null,
      description: form.description || null,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      imageUrls: form.images,
      variants,
      // Add-ons are not edited here — don't send them on update, or they'd be wiped.
      ...(editId ? {} : { addons: [] }),
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
    const variants = p.variants ?? [];
    setEditId(p.id);
    setForm({
      name: p.name,
      priceMajor: toMajor(p.priceMinor),
      salePriceMajor: p.salePriceMinor ? toMajor(p.salePriceMinor) : '',
      stock: p.stock.toString(),
      sku: p.sku ?? '',
      categoryId: p.category?.id ?? '',
      description: p.description ?? '',
      isFeatured: p.isFeatured,
      isActive: p.isActive,
      images: p.images?.map((i) => i.url) ?? [],
      hasVariants: variants.length > 0,
      optionName: variants[0]?.name ?? 'Size',
      variants: variants.map((v) => ({
        id: v.id,
        label: v.label,
        priceMajor: toMajor(v.priceMinor),
        salePriceMajor: v.salePriceMinor ? toMajor(v.salePriceMinor) : '',
        stock: v.stock.toString(),
        sku: v.sku ?? '',
        isActive: v.isActive,
      })),
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

            <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.hasVariants}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hasVariants: e.target.checked,
                    variants: e.target.checked && form.variants.length === 0 ? [emptyRow(), emptyRow()] : form.variants,
                  })
                }
              />
              <span>
                <span className="font-medium">This product has options with different prices</span>
                <span className="block text-xs text-slate-500">e.g. Size S / M / L, Weight 500g / 1kg, Pack of 1 / 3</span>
              </span>
            </label>

            {!form.hasVariants ? (
              <>
                <Input label="Price" type="number" step="0.01" min="0" value={form.priceMajor} onChange={(e) => setForm({ ...form, priceMajor: e.target.value })} required />
                <Input label="Sale price (optional)" type="number" step="0.01" min="0" value={form.salePriceMajor} onChange={(e) => setForm({ ...form, salePriceMajor: e.target.value })} />
                <Input label="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </>
            ) : (
              <div className="space-y-3 md:col-span-2">
                <div className="max-w-xs">
                  <Input label="Option name" placeholder="Size, Weight, Color…" value={form.optionName} onChange={(e) => setForm({ ...form, optionName: e.target.value })} />
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-2 py-2">{form.optionName || 'Option'} value</th>
                        <th className="px-2">Price</th>
                        <th className="px-2">Sale price</th>
                        <th className="px-2">Stock</th>
                        <th className="px-2">SKU</th>
                        <th className="px-2">Active</th>
                        <th className="px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.variants.map((r, i) => (
                        <tr key={r.id ?? `new-${i}`} className="border-t border-slate-100">
                          <td className="px-2 py-1.5"><Input placeholder="e.g. M / 500g" value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} /></td>
                          <td className="w-28 px-2"><Input type="number" step="0.01" min="0" placeholder="0.00" value={r.priceMajor} onChange={(e) => setRow(i, { priceMajor: e.target.value })} /></td>
                          <td className="w-28 px-2"><Input type="number" step="0.01" min="0" placeholder="optional" value={r.salePriceMajor} onChange={(e) => setRow(i, { salePriceMajor: e.target.value })} /></td>
                          <td className="w-20 px-2"><Input type="number" min="0" value={r.stock} onChange={(e) => setRow(i, { stock: e.target.value })} /></td>
                          <td className="w-28 px-2"><Input placeholder="optional" value={r.sku} onChange={(e) => setRow(i, { sku: e.target.value })} /></td>
                          <td className="px-2 text-center"><input type="checkbox" checked={r.isActive} onChange={(e) => setRow(i, { isActive: e.target.checked })} /></td>
                          <td className="whitespace-nowrap px-2 text-slate-400">
                            <button type="button" onClick={() => moveRow(i, -1)} disabled={i === 0} className="px-1 hover:text-slate-700 disabled:opacity-30" aria-label="Move up">↑</button>
                            <button type="button" onClick={() => moveRow(i, 1)} disabled={i === form.variants.length - 1} className="px-1 hover:text-slate-700 disabled:opacity-30" aria-label="Move down">↓</button>
                            <button type="button" onClick={() => setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })} className="px-1 text-red-500 hover:text-red-700" aria-label="Remove option">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, variants: [...form.variants, emptyRow()] })}>+ Add option</Button>
                  <p className="text-xs text-slate-500">The store shows &quot;from&quot; the lowest price. Stock is the total of all options.</p>
                </div>
              </div>
            )}

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
            {rows.map((p) => {
              const optionCount = p.variants?.length ?? 0;
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium">
                    {p.name}
                    {p.isFeatured && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-700">★</span>}
                    {optionCount > 0 && (
                      <span className="ml-2 rounded bg-sky-100 px-1.5 text-xs text-sky-700">
                        {optionCount} {p.variants![0].name.toLowerCase()} option{optionCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  <td>{p.category?.name ?? '—'}</td>
                  <td>{priceRange(p)}</td>
                  <td>{optionCount > 0 ? (p.variants ?? []).reduce((s, v) => s + (v.isActive ? v.stock : 0), 0) : p.stock}</td>
                  <td>{p.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="flex gap-2 py-2">
                    <button onClick={() => startEdit(p)} className="text-emerald-600">Edit</button>
                    <button onClick={() => remove(p.id)} className="text-red-500">Delete</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No products yet</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
