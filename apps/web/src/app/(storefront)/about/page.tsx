import type { Metadata } from 'next';
import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'About Us' };

export default async function AboutPage() {
  const config = await apiServer<StorefrontConfig>('/store/config').catch(() => null);
  if (!config) return null;
  const about = config.info.about;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-heading text-2xl font-semibold">About {config.store.name}</h1>
      {about ? (
        <div className="space-y-3 leading-relaxed text-[rgb(var(--color-fg))]/90">
          {about.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="whitespace-pre-line">{para}</p>
          ))}
        </div>
      ) : (
        <p className="text-[rgb(var(--color-muted))]">
          Welcome to {config.store.name}. Browse our products and order easily
          {config.checkout.mode === 'WHATSAPP_ONLY' ? ' via WhatsApp' : ' online or via WhatsApp'}.
        </p>
      )}
    </div>
  );
}
