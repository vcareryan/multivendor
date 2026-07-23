import Link from 'next/link';

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
}

/**
 * App-style category row: horizontally scrollable rounded cards with an image
 * and caption. `style` is accepted for compatibility; 'grid'/'tiles' render a
 * wrapping grid, everything else scrolls horizontally (mobile-app feel).
 */
export function CategoryGrid({
  categories,
  style = 'carousel',
}: {
  categories: StoreCategory[];
  style?: 'grid' | 'carousel' | 'list' | 'tiles';
}) {
  if (!categories.length) return null;

  const wrap = style === 'grid' || style === 'tiles';
  const container = wrap
    ? 'grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6'
    : 'flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

  return (
    <div className={container}>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/category/${cat.slug}`}
          className={`${wrap ? '' : 'w-24 shrink-0'} flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-[rgb(var(--color-surface))] p-2 text-center ring-1 ring-black/5 transition hover:ring-brand`}
        >
          <div className="h-16 w-16 overflow-hidden rounded-xl bg-black/10">
            {cat.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-brand">{cat.name.charAt(0)}</span>
            )}
          </div>
          <span className="line-clamp-2 text-xs font-medium leading-tight">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
