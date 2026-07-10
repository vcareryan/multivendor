import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';
import { CategoryGrid, type StoreCategory } from '@/components/storefront/CategoryGrid';
import { ProductCard, type StoreProduct } from '@/components/storefront/ProductCard';
import { Banners } from '@/components/storefront/Banners';

export const dynamic = 'force-dynamic';

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/** Grid density adapts to the theme's product-card variant. */
function gridClass(variant: string): string {
  if (variant === 'compact') return 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5';
  if (variant === 'detailed') return 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3';
  return 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4';
}

export default async function HomePage() {
  const [config, categories, featured, all] = await Promise.all([
    safe(apiServer<StorefrontConfig>('/store/config'), null as unknown as StorefrontConfig),
    safe(apiServer<StoreCategory[]>('/catalog/categories'), []),
    safe(apiServer<{ data: StoreProduct[] }>('/catalog/products?featured=true&pageSize=8'), { data: [] }),
    safe(apiServer<{ data: StoreProduct[] }>('/catalog/products?pageSize=24'), { data: [] }),
  ]);

  if (!config) return null;
  const currency = config.store.currency;
  const theme = config.theme;
  const banners = theme?.banners ?? [];
  const cardVariant = theme?.productCardVariant ?? 'image-first';
  const grid = gridClass(cardVariant);
  const offersEnabled = theme?.features?.offersSection ?? false;
  const onSale = all.data.filter((p) => p.salePriceMinor != null && p.salePriceMinor < p.priceMinor);

  return (
    <div className="space-y-8">
      {/* Banner(s) */}
      {banners.length > 0 ? (
        <Banners banners={banners} />
      ) : (
        <div className="rounded-theme bg-gradient-to-r from-brand to-accent p-8 text-brand-fg md:p-12">
          <h1 className="font-heading text-3xl font-bold md:text-4xl">{config.store.name}</h1>
          <p className="mt-2 max-w-lg opacity-90">
            Order now — {config.checkout.mode === 'WHATSAPP_ONLY' ? 'via WhatsApp' : 'online or via WhatsApp'}.
          </p>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-xl font-semibold">Shop by category</h2>
          <CategoryGrid categories={categories} style={theme?.categoryDisplayStyle ?? 'grid'} />
        </section>
      )}

      {/* Offers / deals — only when the template enables it */}
      {offersEnabled && onSale.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-xl font-semibold text-accent">Today&apos;s offers</h2>
          <div className={grid}>
            {onSale.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} variant={cardVariant} />
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.data.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-xl font-semibold">Featured</h2>
          <div className={grid}>
            {featured.data.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} variant={cardVariant} />
            ))}
          </div>
        </section>
      )}

      {/* All products */}
      <section>
        <h2 className="mb-3 font-heading text-xl font-semibold">Products</h2>
        <div className={grid}>
          {all.data.map((p) => (
            <ProductCard key={p.id} product={p} currency={currency} variant={cardVariant} />
          ))}
        </div>
        {all.data.length === 0 && <p className="text-[rgb(var(--color-muted))]">No products yet.</p>}
      </section>
    </div>
  );
}
