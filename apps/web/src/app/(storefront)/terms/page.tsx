import type { Metadata } from 'next';
import { apiServer } from '@/lib/api';
import { LegalArticle } from '@/components/storefront/LegalArticle';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Terms & Conditions' };

interface Legal { privacy: string | null; terms: string | null; refund: string | null }

export default async function TermsPage() {
  const legal = await apiServer<Legal>('/store/legal').catch(() => null);
  if (!legal?.terms) {
    return <p className="mx-auto max-w-2xl py-12 text-center text-[rgb(var(--color-muted))]">This page is not available.</p>;
  }
  return <LegalArticle title="Terms & Conditions" content={legal.terms} />;
}
