'use client';

import Link from 'next/link';
import { useCart, itemKey } from '@/lib/cart-store';
import { formatMoney } from '@/lib/format';

export default function CartPage() {
  const { items, setQty, remove, subtotalMinor } = useCart();

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-[rgb(var(--color-muted))]">Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block rounded-theme bg-brand px-5 py-2.5 text-brand-fg">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 font-heading text-2xl font-semibold">Your cart</h1>
      <div className="space-y-3">
        {items.map((item) => {
          const key = itemKey(item);
          return (
            <div key={key} className="flex items-center gap-3 rounded-theme border border-black/5 bg-[rgb(var(--color-surface))] p-3">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded object-cover" />
              ) : (
                <div className="h-16 w-16 rounded bg-slate-100" />
              )}
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.variantLabel && <p className="text-sm text-[rgb(var(--color-muted))]">{item.variantLabel}</p>}
                <p className="text-sm">{formatMoney(item.unitPriceMinor)}</p>
              </div>
              <div className="flex items-center rounded-theme border border-slate-300">
                <button onClick={() => setQty(key, item.quantity - 1)} className="px-2 py-1">−</button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button onClick={() => setQty(key, item.quantity + 1)} className="px-2 py-1">+</button>
              </div>
              <button onClick={() => remove(key)} className="text-sm text-red-500">Remove</button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-theme border border-black/5 bg-[rgb(var(--color-surface))] p-4">
        <span className="text-lg">Subtotal</span>
        <span className="text-lg font-semibold">{formatMoney(subtotalMinor())}</span>
      </div>

      <Link href="/checkout" className="mt-4 block rounded-theme bg-brand px-5 py-3 text-center font-medium text-brand-fg">
        Proceed to checkout
      </Link>
    </div>
  );
}
