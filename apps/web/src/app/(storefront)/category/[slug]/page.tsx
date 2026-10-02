import type { Metadata } from 'next';
import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';
import { ProductCard, type StoreProduct } from '@/components/storefront/ProductCard';

export const dynamic = 'force-dynamic';

function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const name = titleCase(params.slug);
  return { title: name, description: `Browse ${name} products.` };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const [config, products] = await Promise.all([
    apiServer<StorefrontConfig>('/store/config').catch(() => null),
    apiServer<{ data: StoreProduct[] }>(
      `/catalog/products?categorySlug=${encodeURIComponent(params.slug)}&pageSize=48`,
    ).catch(() => ({ data: [] as StoreProduct[] })),
  ]);
  if (!config) return null;
  const variant = config.theme?.productCardVariant ?? 'image-first';
  const grid =
    variant === 'compact'
      ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5'
      : variant === 'detailed'
        ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3'
        : 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4';

  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-semibold">{titleCase(params.slug)}</h1>
      <div className={grid}>
        {products.data.map((p) => (
          <ProductCard key={p.id} product={p} currency={config.store.currency} variant={variant} />
        ))}
      </div>
      {products.data.length === 0 && <p className="text-[rgb(var(--color-muted))]">No products in this category.</p>}
    </div>
  );
}
