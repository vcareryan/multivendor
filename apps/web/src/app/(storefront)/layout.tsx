import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';
import { ThemeStyle } from '@/themes/theme-provider';
import { Header } from '@/components/storefront/Header';
import { PlatformLanding } from '@/components/storefront/PlatformLanding';

export const dynamic = 'force-dynamic';

async function getConfig(): Promise<StorefrontConfig | null> {
  try {
    return await apiServer<StorefrontConfig>('/store/config', { revalidate: 30 });
  } catch {
    return null;
  }
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfig();

  // No tenant resolved for this host → show the platform landing page.
  if (!config) {
    return <PlatformLanding />;
  }

  return (
    <>
      <ThemeStyle theme={config.theme} />
      <div className="min-h-screen">
        <Header storeName={config.store.name} logoUrl={config.store.logoUrl} />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mt-12 border-t border-black/5 py-8 text-center text-sm text-[rgb(var(--color-muted))]">
          <p>{config.store.name}</p>
          <p className="mt-1">Developed By Income inn Technologies</p>
        </footer>
      </div>
    </>
  );
}
