'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Shop' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
];

/** Mobile hamburger + left slide-in drawer menu. */
export function NavDrawer({
  storeName,
  logoUrl,
  extraLinks = [],
}: {
  storeName: string;
  logoUrl?: string | null;
  extraLinks?: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]); // close on navigation
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // The drawer is portalled to <body> so its position:fixed is relative to the
  // viewport — NOT trapped inside the header's backdrop-filter containing block
  // (which previously clipped it to the header height and left the menu with no
  // background).
  const drawer = (
    <div className={`fixed inset-0 z-[100] md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={() => setOpen(false)}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        style={{ backgroundColor: 'rgb(var(--color-surface, 255 255 255))', color: 'rgb(var(--color-fg, 15 23 42))' }}
        className={`absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-black/10 p-4">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={storeName} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-bold text-brand-fg">{storeName.charAt(0)}</span>
            )}
            <span className="font-heading font-semibold">{storeName}</span>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV_LINKS.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-3 text-sm font-medium ${active ? 'bg-brand/10 text-brand' : 'hover:bg-black/5'}`}
              >
                {l.label}
              </Link>
            );
          })}
          {extraLinks.length > 0 && (
            <div className="mt-2 border-t border-black/10 pt-2">
              {extraLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`block rounded-lg px-3 py-2.5 text-sm ${pathname.startsWith(l.href) ? 'text-brand' : 'text-[rgb(var(--color-muted))] hover:bg-black/5'}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 md:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
