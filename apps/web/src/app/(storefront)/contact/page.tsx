import type { Metadata } from 'next';
import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Contact Us' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-black/5 py-3">
      <span className="text-xs uppercase tracking-wide text-[rgb(var(--color-muted))]">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

export default async function ContactPage() {
  const config = await apiServer<StorefrontConfig>('/store/config').catch(() => null);
  if (!config) return null;
  const { info, store } = config;
  const wa = store.whatsappNumber?.replace(/[^\d]/g, '');
  const socials = info.socialLinks ?? {};

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-heading text-2xl font-semibold">Contact {store.name}</h1>

      <div className="rounded-2xl border border-black/5 bg-[rgb(var(--color-surface))] p-4 ring-1 ring-black/5">
        {info.address && <Row label="Address">{info.address}</Row>}
        {info.phone && (
          <Row label="Phone">
            <a href={`tel:${info.phone}`} className="text-brand hover:underline">{info.phone}</a>
          </Row>
        )}
        {info.email && (
          <Row label="Email">
            <a href={`mailto:${info.email}`} className="text-brand hover:underline">{info.email}</a>
          </Row>
        )}
        {wa && (
          <Row label="WhatsApp">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              Chat on WhatsApp
            </a>
          </Row>
        )}
        {Object.entries(socials).filter(([, v]) => v).length > 0 && (
          <Row label="Follow us">
            <span className="flex flex-wrap gap-3">
              {Object.entries(socials)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="capitalize text-brand hover:underline">
                    {k}
                  </a>
                ))}
            </span>
          </Row>
        )}
        {!info.address && !info.phone && !info.email && !wa && (
          <p className="py-4 text-[rgb(var(--color-muted))]">Contact details will be available soon.</p>
        )}
      </div>

      {wa && (
        <a
          href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${store.name}, I have a question.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-medium text-brand-fg"
        >
          Message us on WhatsApp
        </a>
      )}
    </div>
  );
}
