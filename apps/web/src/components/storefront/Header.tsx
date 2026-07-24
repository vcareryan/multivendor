'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { useCustomer } from '@/lib/customer-store';
import { InstallButton } from '@/components/pwa/InstallButton';
import { NavDrawer, NAV_LINKS } from '@/components/storefront/NavDrawer';

export function Header({
  storeName,
  logoUrl,
  menuLinks = [],
}: {
  storeName: string;
  logoUrl?: string | null;
  menuLinks?: { href: string; label: string }[];
}) {
  const count = useCart((s) => s.count());
  const session = useCustomer((s) => s.session);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-[rgb(var(--color-surface))]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <NavDrawer storeName={storeName} logoUrl={logoUrl} extraLinks={menuLinks} />
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={storeName} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-bold text-brand-fg">
                {storeName.charAt(0)}
              </span>
            )}
            <span className="font-heading text-lg font-semibold">{storeName}</span>
          </Link>
        </div>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <InstallButton className="hidden sm:inline-flex" />
          <Link href="/search" aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </Link>
          <Link href="/account" aria-label="Account" className="flex h-9 items-center justify-center gap-1.5 rounded-full px-2 hover:bg-black/5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
            {mounted && session && (
              <span className="hidden max-w-24 truncate text-sm font-medium sm:inline">{session.customer.name || 'Account'}</span>
            )}
          </Link>
          <Link href="/cart" aria-label="Cart" className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.4 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L22 7H6" /></svg>
            {mounted && count > 0 && (
              <span key={count} className="animate-pop absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
