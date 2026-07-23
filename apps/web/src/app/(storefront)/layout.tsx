import type { Metadata } from 'next';
import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';
import { ThemeStyle } from '@/themes/theme-provider';
import { Header } from '@/components/storefront/Header';
import { BottomNav } from '@/components/storefront/BottomNav';
import { Toaster } from '@/components/storefront/Toaster';
import { PlatformLanding } from '@/components/storefront/PlatformLanding';
import { StoreUnavailable } from '@/components/storefront/StoreUnavailable';

export const dynamic = 'force-dynamic';

async function getConfig(): Promise<StorefrontConfig | null> {
  try {
    // No-store so theme / SEO / settings changes made in the admin appear on the
    // very next request (the API already caches this read in Redis, keyed per
    // tenant, so it stays fast).
    return await apiServer<StorefrontConfig>('/store/config');
  } catch {
    return null;
  }
}

/** Per-store SEO: title, description, OG, robots, and Google site verification. */
export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  if (!config) return { title: 'Online Store' };
  const seo = config.seo;
  const name = config.store.name;
  const title = seo.title || name;
  const description = seo.description || `Shop online at ${name}.`;
  const ogImages = seo.ogImageUrl ? [seo.ogImageUrl] : config.store.logoUrl ? [config.store.logoUrl] : [];

  return {
    title: { default: title, template: `%s · ${name}` },
    description,
    keywords: seo.keywords || undefined,
    applicationName: name,
    robots: seo.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { title, description, siteName: name, type: 'website', images: ogImages },
    twitter: { card: 'summary_large_image', title, description, images: ogImages },
    icons: config.store.logoUrl ? { icon: config.store.logoUrl, apple: config.store.logoUrl } : undefined,
    verification: seo.googleSiteVerification ? { google: seo.googleSiteVerification } : undefined,
  };
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfig();

  // No active store for this host. Either the store exists but is suspended/
  // pending/disabled (→ status page), or it's the platform/unknown host (→ landing).
  if (!config) {
    const availability = await apiServer<{ status: string; name: string } | null>('/store/availability').catch(() => null);
    if (availability && availability.status && availability.status !== 'ACTIVE') {
      return <StoreUnavailable status={availability.status} name={availability.name} />;
    }
    return <PlatformLanding />;
  }

  return (
    <>
      <ThemeStyle theme={config.theme} />
      <div className="min-h-screen">
        <Header storeName={config.store.name} logoUrl={config.store.logoUrl} />
        <main className="mx-auto max-w-6xl px-4 py-5 pb-24 md:pb-8">{children}</main>
        <footer className="border-t border-black/5 py-8 text-center text-sm text-[rgb(var(--color-muted))]">
          <p>{config.store.name}</p>
          <p className="mt-1">Developed By Income inn Technologies</p>
        </footer>
        <BottomNav />
        <Toaster />
      </div>
    </>
  );
}
