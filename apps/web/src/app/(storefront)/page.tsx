import { apiServer } from '@/lib/api';
import type { StorefrontConfig, ApiListResponse } from '@utanstore/shared';
import { CategoryGrid, type StoreCategory } from '@/components/storefront/CategoryGrid';
import { ProductCard, type StoreProduct } from '@/components/storefront/ProductCard';

export const dynamic = 'force-dynamic';

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function HomePage() {
  const [config, categories, featured, all] = await Promise.all([
    safe(apiServer<StorefrontConfig>('/store/config', { revalidate: 30 }), null as unknown as StorefrontConfig),
    safe(apiServer<StoreCategory[]>('/catalog/categories', { revalidate: 30 }), []),
    safe(apiServer<{ data: StoreProduct[] }>('/catalog/products?featured=true&pageSize=8'), { data: [] }),
    safe(apiServer<{ data: StoreProduct[] }>('/catalog/products?pageSize=12'), { data: [] }),
  ]);

  if (!config) return null;
  const currency = config.store.currency;
  const theme = config.theme;
  const banners = theme?.banners ?? [];
  const cardVariant = theme?.productCardVariant ?? 'image-first';

  return (
    <div className="space-y-8">
      {/* Banner */}
      {banners.length > 0 ? (
        <div className="overflow-hidden rounded-theme">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banners[0].imageUrl} alt={banners[0].title ?? ''} className="h-48 w-full object-cover md:h-64" />
        </div>
      ) : (
        <div className="rounded-theme bg-gradient-to-r from-brand to-accent p-8 text-brand-fg md:p-12">
          <h1 className="font-heading text-3xl font-bold md:text-4xl">{config.store.name}</h1>
          <p className="mt-2 max-w-lg opacity-90">Fresh picks, great prices. Order now — {config.checkout.mode === 'WHATSAPP_ONLY' ? 'via WhatsApp' : 'online or via WhatsApp'}.</p>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-xl font-semibold">Categories</h2>
          <CategoryGrid categories={categories} style={theme?.categoryDisplayStyle ?? 'grid'} />
        </section>
      )}

      {/* Featured */}
      {featured.data.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-xl font-semibold">Featured</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {featured.data.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} variant={cardVariant} />
            ))}
          </div>
        </section>
      )}

      {/* All products */}
      <section>
        <h2 className="mb-3 font-heading text-xl font-semibold">Products</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {all.data.map((p) => (
            <ProductCard key={p.id} product={p} currency={currency} variant={cardVariant} />
          ))}
        </div>
        {all.data.length === 0 && <p className="text-[rgb(var(--color-muted))]">No products yet.</p>}
      </section>
    </div>
  );
}
