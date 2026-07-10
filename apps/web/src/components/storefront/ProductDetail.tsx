'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-store';
import { formatMoney } from '@/lib/format';

interface Variant {
  id: string;
  label: string;
  priceMinor: number;
  salePriceMinor?: number | null;
  stock: number;
  isActive: boolean;
}
interface Addon {
  id: string;
  name: string;
  priceMinor: number;
}
export interface ProductDetailData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMinor: number;
  salePriceMinor?: number | null;
  stock: number;
  trackInventory: boolean;
  isPreOrder: boolean;
  images: { url: string }[];
  variants: Variant[];
  addons: Addon[];
}

export function ProductDetail({ product, currency }: { product: ProductDetailData; currency: string }) {
  const add = useCart((s) => s.add);
  const router = useRouter();
  const [variantId, setVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const basePrice = variant ? variant.salePriceMinor ?? variant.priceMinor : product.salePriceMinor ?? product.priceMinor;
  const addonTotal = useMemo(
    () => product.addons.filter((a) => addonIds.includes(a.id)).reduce((s, a) => s + a.priceMinor, 0),
    [addonIds, product.addons],
  );
  const unit = basePrice + addonTotal;
  const soldOut = product.trackInventory && (variant ? variant.stock <= 0 : product.stock <= 0) && !product.isPreOrder;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="aspect-square overflow-hidden rounded-theme bg-slate-100">
          {product.images[imgIdx]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[imgIdx].url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">No image</div>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {product.images.map((im, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={im.url} alt="" onClick={() => setImgIdx(i)} className={`h-16 w-16 cursor-pointer rounded object-cover ${i === imgIdx ? 'ring-2 ring-brand' : ''}`} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="font-heading text-2xl font-bold">{product.name}</h1>
        <div className="mt-2 text-2xl font-semibold text-brand">{formatMoney(unit, currency)}</div>
        {product.description && <p className="mt-4 whitespace-pre-line text-slate-600">{product.description}</p>}

        {product.variants.length > 0 && (
          <div className="mt-5">
            <label className="mb-1 block text-sm font-medium">Options</label>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  className={`rounded-theme border px-3 py-1.5 text-sm ${variantId === v.id ? 'border-brand bg-brand text-brand-fg' : 'border-slate-300'}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {product.addons.length > 0 && (
          <div className="mt-5">
            <label className="mb-1 block text-sm font-medium">Add-ons</label>
            <div className="space-y-1">
              {product.addons.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addonIds.includes(a.id)}
                    onChange={(e) => setAddonIds((prev) => (e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id)))}
                  />
                  {a.name} (+{formatMoney(a.priceMinor, currency)})
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center rounded-theme border border-slate-300">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1.5">−</button>
            <span className="w-10 text-center">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="px-3 py-1.5">+</button>
          </div>
          <button
            disabled={soldOut}
            onClick={() =>
              add(
                {
                  productId: product.id,
                  variantId: variant?.id ?? null,
                  name: product.name,
                  variantLabel: variant?.label ?? null,
                  unitPriceMinor: unit,
                  imageUrl: product.images[0]?.url ?? null,
                  addonIds,
                },
                qty,
              )
            }
            className="flex-1 rounded-theme bg-brand px-4 py-2.5 font-medium text-brand-fg disabled:opacity-50"
          >
            {soldOut ? 'Out of stock' : product.isPreOrder ? 'Pre-order' : 'Add to cart'}
          </button>
          <button onClick={() => router.push('/cart')} className="rounded-theme border border-brand px-4 py-2.5 text-brand">
            Go to cart
          </button>
        </div>
      </div>
    </div>
  );
}
