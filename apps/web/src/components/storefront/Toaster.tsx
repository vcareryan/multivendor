'use client';

import Link from 'next/link';
import { useToast } from '@/lib/toast-store';

/** Renders add-to-cart toasts above the mobile bottom nav (and bottom-right on desktop). */
export function Toaster() {
  const toasts = useToast((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl bg-slate-900/95 px-3 py-2.5 text-white shadow-lg ring-1 ring-white/10"
        >
          {t.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
          )}
          <span className="flex-1 text-sm leading-tight">{t.message}</span>
          <Link href="/cart" className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-accent hover:bg-white/10">
            View
          </Link>
        </div>
      ))}
    </div>
  );
}
