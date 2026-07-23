'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useToast } from './toast-store';

export interface CartItem {
  productId: string;
  variantId?: string | null;
  name: string;
  variantLabel?: string | null;
  unitPriceMinor: number;
  imageUrl?: string | null;
  quantity: number;
  addonIds: string[];
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  count: () => number;
  subtotalMinor: () => number;
}

export const itemKey = (i: { productId: string; variantId?: string | null }) => `${i.productId}:${i.variantId ?? ''}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => {
        set((state) => {
          const key = itemKey(item);
          const existing = state.items.find((i) => itemKey(i) === key);
          if (existing) {
            return { items: state.items.map((i) => (itemKey(i) === key ? { ...i, quantity: i.quantity + qty } : i)) };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        });
        // Fire-and-forget UI feedback (no coupling for callers).
        useToast.getState().show(`${item.name} added to cart`, item.imageUrl);
      },
      setQty: (key, qty) =>
        set((state) => ({
          items: qty <= 0 ? state.items.filter((i) => itemKey(i) !== key) : state.items.map((i) => (itemKey(i) === key ? { ...i, quantity: qty } : i)),
        })),
      remove: (key) => set((state) => ({ items: state.items.filter((i) => itemKey(i) !== key) })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotalMinor: () => get().items.reduce((s, i) => s + i.unitPriceMinor * i.quantity, 0),
    }),
    { name: 'utanstore-cart' },
  ),
);
