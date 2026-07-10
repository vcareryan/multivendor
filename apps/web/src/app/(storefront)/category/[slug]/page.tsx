import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';
import { ProductCard, type StoreProduct } from '@/components/storefront/ProductCard';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const [config, products] = await Promise.all([
    apiServer<StorefrontConfig>('/store/config', { revalidate: 30 }).catch(() => null),
    apiServer<{ data: StoreProduct[] }>(`/catalog/products?categorySlug=${encodeURIComponent(params.slug)}&pageSize=48`).catch(() => ({ data: [] as StoreProduct[] })),
  ]);
  if (!config) return null;

  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-semibold capitalize">{params.slug.replace(/-/g, ' ')}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {products.data.map((p) => (
          <ProductCard key={p.id} product={p} currency={config.store.currency} variant={config.theme?.productCardVariant ?? 'image-first'} />
        ))}
      </div>
      {products.data.length === 0 && <p className="text-[rgb(var(--color-muted))]">No products in this category.</p>}
    </div>
  );
}
