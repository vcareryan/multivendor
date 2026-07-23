'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-store';
import { formatMoney } from '@/lib/format';

export interface StoreProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMinor: number;
  salePriceMinor?: number | null;
  stock: number;
  trackInventory: boolean;
  isPreOrder: boolean;
  images: { url: string; alt?: string | null }[];
  variants?: { id: string }[];
}

export function ProductCard({
  product,
  currency,
  variant = 'image-first',
}: {
  product: StoreProduct;
  currency: string;
  variant?: 'compact' | 'image-first' | 'detailed';
}) {
  const add = useCart((s) => s.add);
  const price = product.salePriceMinor ?? product.priceMinor;
  const onSale = product.salePriceMinor != null && product.salePriceMinor < product.priceMinor;
  const discount = onSale ? Math.round(((product.priceMinor - price) / product.priceMinor) * 100) : 0;
  const soldOut = product.trackInventory && product.stock <= 0 && !product.isPreOrder;
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const img = product.images[0]?.url;

  const aspect = variant === 'image-first' ? 'aspect-[4/3]' : variant === 'detailed' ? 'aspect-[4/3]' : 'aspect-square';

  function addToCart() {
    add({ productId: product.id, name: product.name, unitPriceMinor: price, imageUrl: img, addonIds: [] });
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[rgb(var(--color-surface))] shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
      <Link href={`/product/${product.slug}`} className={`relative block ${aspect} overflow-hidden bg-black/10`}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-[rgb(var(--color-muted))]">No image</div>
        )}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">-{discount}%</span>
        )}
        {soldOut && <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">Out of stock</span>}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3 pr-12">
        <Link href={`/product/${product.slug}`} className="line-clamp-2 text-sm font-medium leading-snug hover:text-brand">
          {product.name}
        </Link>
        {variant === 'detailed' && product.description && (
          <p className="line-clamp-1 text-xs text-[rgb(var(--color-muted))]">{product.description}</p>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-semibold">{formatMoney(price, currency)}</span>
          {onSale && <span className="text-xs text-[rgb(var(--color-muted))] line-through">{formatMoney(product.priceMinor, currency)}</span>}
        </div>
      </div>

      {/* Floating add button (app style). Variants → go to product to choose. */}
      {hasVariants ? (
        <Link
          href={`/product/${product.slug}`}
          aria-label="Select options"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-md transition hover:brightness-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
        </Link>
      ) : (
        <button
          disabled={soldOut}
          onClick={addToCart}
          aria-label={product.isPreOrder ? 'Pre-order' : 'Add to cart'}
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
        </button>
      )}
    </div>
  );
}
