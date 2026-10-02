import type { Metadata } from 'next';
import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';
import { ProductCard, type StoreProduct } from '@/components/storefront/ProductCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Shop' };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  const query = q ? `/catalog/products?search=${encodeURIComponent(q)}&pageSize=48` : '/catalog/products?pageSize=48';
  const [config, products] = await Promise.all([
    apiServer<StorefrontConfig>('/store/config').catch(() => null),
    apiServer<{ data: StoreProduct[] }>(query).catch(() => ({ data: [] as StoreProduct[] })),
  ]);
  if (!config) return null;
  const variant = config.theme?.productCardVariant ?? 'image-first';

  return (
    <div>
      <form action="/search" method="get" className="mb-5">
        <div className="flex items-center gap-2 rounded-full border border-black/10 bg-[rgb(var(--color-surface))] px-4 py-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[rgb(var(--color-muted))]"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products…"
            autoComplete="off"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[rgb(var(--color-muted))]"
          />
        </div>
      </form>

      <h1 className="mb-3 font-heading text-lg font-semibold">
        {q ? `Results for “${q}”` : 'All products'}
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.data.map((p) => (
          <ProductCard key={p.id} product={p} currency={config.store.currency} variant={variant} />
        ))}
      </div>
      {products.data.length === 0 && (
        <p className="py-10 text-center text-[rgb(var(--color-muted))]">
          {q ? 'No products matched your search.' : 'No products yet.'}
        </p>
      )}
    </div>
  );
}
