import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';
import { CategoryGrid, type StoreCategory } from '@/components/storefront/CategoryGrid';
import { ProductCard, type StoreProduct } from '@/components/storefront/ProductCard';
import { Banners } from '@/components/storefront/Banners';
import { SectionHeader } from '@/components/storefront/SectionHeader';

export const dynamic = 'force-dynamic';

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';

export default async function HomePage() {
  const [config, categories, newArrivals, popular] = await Promise.all([
    safe(apiServer<StorefrontConfig>('/store/config'), null as unknown as StorefrontConfig),
    safe(apiServer<StoreCategory[]>('/catalog/categories'), []),
    safe(apiServer<{ data: StoreProduct[] }>('/catalog/products?pageSize=8'), { data: [] }),
    safe(apiServer<{ data: StoreProduct[] }>('/catalog/products?featured=true&pageSize=8'), { data: [] }),
  ]);

  if (!config) return null;
  const currency = config.store.currency;
  const theme = config.theme;
  const banners = theme?.banners ?? [];
  const cardVariant = theme?.productCardVariant ?? 'image-first';
  const offersEnabled = theme?.features?.offersSection ?? false;
  const onSale = newArrivals.data.filter((p) => p.salePriceMinor != null && p.salePriceMinor < p.priceMinor);
  // "Popular" falls back to newest when nothing is marked featured.
  const popularList = popular.data.length ? popular.data : newArrivals.data;

  return (
    <div className="space-y-7">
      {banners.length > 0 ? (
        <Banners banners={banners} />
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand to-accent p-6 text-brand-fg md:p-10">
          <h1 className="font-heading text-2xl font-bold md:text-4xl">{config.store.name}</h1>
          <p className="mt-2 max-w-lg text-sm opacity-90 md:text-base">
            Order now — {config.checkout.mode === 'WHATSAPP_ONLY' ? 'via WhatsApp' : 'online or via WhatsApp'}.
          </p>
        </div>
      )}

      {categories.length > 0 && (
        <section>
          <SectionHeader title="Categories" href="/search" />
          <CategoryGrid categories={categories} style={theme?.categoryDisplayStyle ?? 'carousel'} />
        </section>
      )}

      {offersEnabled && onSale.length > 0 && (
        <section>
          <SectionHeader title="Today's offers" href="/search" />
          <div className={GRID}>
            {onSale.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} variant={cardVariant} />
            ))}
          </div>
        </section>
      )}

      {newArrivals.data.length > 0 && (
        <section>
          <SectionHeader title="New Arrivals" href="/search" />
          <div className={GRID}>
            {newArrivals.data.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} variant={cardVariant} />
            ))}
          </div>
        </section>
      )}

      {popularList.length > 0 && (
        <section>
          <SectionHeader title="Popular Products" href="/search" />
          <div className={GRID}>
            {popularList.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} variant={cardVariant} />
            ))}
          </div>
        </section>
      )}

      {newArrivals.data.length === 0 && popularList.length === 0 && (
        <p className="py-10 text-center text-[rgb(var(--color-muted))]">No products yet.</p>
      )}
    </div>
  );
}
