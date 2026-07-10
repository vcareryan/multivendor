'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ThemeBanner } from '@utanstore/shared';

/** Auto-rotating banner carousel for the storefront hero. */
export function Banners({ banners }: { banners: ThemeBanner[] }) {
  const ordered = [...banners].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const [i, setI] = useState(0);

  useEffect(() => {
    if (ordered.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % ordered.length), 5000);
    return () => clearInterval(t);
  }, [ordered.length]);

  if (ordered.length === 0) return null;
  const b = ordered[Math.min(i, ordered.length - 1)];

  const inner = (
    <div className="relative h-44 w-full overflow-hidden rounded-theme sm:h-56 md:h-72">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.imageUrl} alt={b.title ?? ''} className="h-full w-full object-cover" />
      {(b.title || b.subtitle || b.ctaLabel) && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-5 text-white">
          {b.title && <h2 className="font-heading text-xl font-bold md:text-3xl">{b.title}</h2>}
          {b.subtitle && <p className="mt-1 max-w-lg text-sm opacity-90 md:text-base">{b.subtitle}</p>}
          {b.ctaLabel && (
            <span className="mt-3 inline-block w-fit rounded-theme bg-brand px-4 py-2 text-sm font-medium text-brand-fg">{b.ctaLabel}</span>
          )}
        </div>
      )}
      {ordered.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {ordered.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
          ))}
        </div>
      )}
    </div>
  );

  return b.ctaHref ? <Link href={b.ctaHref}>{inner}</Link> : inner;
}
