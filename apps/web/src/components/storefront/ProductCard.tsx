'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-store';
import { formatMoney } from '@/lib/format';

export interface StoreProduct {
  id: string;
  name: string;
  slug: string;
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
  const soldOut = product.trackInventory && product.stock <= 0 && !product.isPreOrder;
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const img = product.images[0]?.url;

  return (
    <div className="group flex flex-col overflow-hidden rounded-theme border border-black/5 bg-[rgb(var(--color-surface))] shadow-sm transition hover:shadow-md">
      <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-slate-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">No image</div>
        )}
        {onSale && <span className="absolute left-2 top-2 rounded bg-accent px-2 py-0.5 text-xs font-semibold text-white">Sale</span>}
        {soldOut && <span className="absolute right-2 top-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-white">Out of stock</span>}
      </Link>

      <div className={`flex flex-1 flex-col gap-1 p-3 ${variant === 'compact' ? 'text-sm' : ''}`}>
        <Link href={`/product/${product.slug}`} className="line-clamp-2 font-medium hover:text-brand">
          {product.name}
        </Link>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-semibold">{formatMoney(price, currency)}</span>
          {onSale && <span className="text-xs text-[rgb(var(--color-muted))] line-through">{formatMoney(product.priceMinor, currency)}</span>}
        </div>

        {hasVariants ? (
          <Link href={`/product/${product.slug}`} className="mt-2 rounded-theme border border-brand px-3 py-1.5 text-center text-sm text-brand">
            Select options
          </Link>
        ) : (
          <button
            disabled={soldOut}
            onClick={() =>
              add({
                productId: product.id,
                name: product.name,
                unitPriceMinor: price,
                imageUrl: img,
                addonIds: [],
              })
            }
            className="mt-2 rounded-theme bg-brand px-3 py-1.5 text-sm text-brand-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {soldOut ? 'Out of stock' : product.isPreOrder ? 'Pre-order' : 'Add to cart'}
          </button>
        )}
      </div>
    </div>
  );
}
