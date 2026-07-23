import Link from 'next/link';

/** Section title with an optional "View All" link (app-style). */
export function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-medium text-accent hover:underline">
          View All ›
        </Link>
      )}
    </div>
  );
}
