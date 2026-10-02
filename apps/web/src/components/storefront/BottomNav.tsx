'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart-store';

const ICONS = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
  ),
  shop: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18l-1.5 11H4.5L3 9Z" /><path d="M8 9V6a4 4 0 0 1 8 0v3" /></svg>
  ),
  cart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.4 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L22 7H6" /></svg>
  ),
};

const TABS = [
  { href: '/', label: 'Home', icon: ICONS.home },
  { href: '/search', label: 'Shop', icon: ICONS.shop },
  { href: '/cart', label: 'Cart', icon: ICONS.cart, badge: true },
];

/** Fixed bottom navigation — mobile only (desktop uses the header). */
export function BottomNav() {
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[rgb(var(--color-nav-bg,var(--color-surface)))] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          const active = t.href === '/' ? pathname === '/' : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-[rgb(var(--color-nav-active,var(--color-brand)))]' : 'text-[rgb(var(--color-nav-inactive,var(--color-muted)))]'}`}
            >
              <span className="relative">
                {t.icon}
                {t.badge && mounted && count > 0 && (
                  <span key={count} className="animate-pop absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-white">
                    {count}
                  </span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
