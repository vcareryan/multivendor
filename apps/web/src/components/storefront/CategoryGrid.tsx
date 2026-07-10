import Link from 'next/link';

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
}

export function CategoryGrid({
  categories,
  style = 'grid',
}: {
  categories: StoreCategory[];
  style?: 'grid' | 'carousel' | 'list' | 'tiles';
}) {
  if (!categories.length) return null;

  const layout =
    style === 'carousel'
      ? 'flex gap-3 overflow-x-auto pb-2'
      : style === 'list'
        ? 'flex flex-col gap-2'
        : style === 'tiles'
          ? 'grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6'
          : 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4';

  return (
    <div className={layout}>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/category/${cat.slug}`}
          className="flex min-w-[120px] flex-col items-center gap-2 rounded-theme border border-black/5 bg-[rgb(var(--color-surface))] p-3 text-center transition hover:border-brand"
        >
          {cat.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cat.imageUrl} alt={cat.name} className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">{cat.name.charAt(0)}</span>
          )}
          <span className="text-sm font-medium">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
