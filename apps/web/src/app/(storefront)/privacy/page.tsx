import type { Metadata } from 'next';
import { apiServer } from '@/lib/api';
import { LegalArticle } from '@/components/storefront/LegalArticle';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Privacy Policy' };

interface Legal { privacy: string | null; terms: string | null; refund: string | null }

export default async function PrivacyPage() {
  const legal = await apiServer<Legal>('/store/legal').catch(() => null);
  if (!legal?.privacy) {
    return <p className="mx-auto max-w-2xl py-12 text-center text-[rgb(var(--color-muted))]">This page is not available.</p>;
  }
  return <LegalArticle title="Privacy Policy" content={legal.privacy} />;
}
