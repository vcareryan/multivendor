import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiServer } from '@/lib/api';
import { LegalArticle } from '@/components/storefront/LegalArticle';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Refund & Return Policy' };

interface Legal { privacy: string | null; terms: string | null; refund: string | null }

export default async function RefundPage() {
  const legal = await apiServer<Legal>('/store/legal').catch(() => null);
  if (!legal?.refund) notFound();
  return <LegalArticle title="Refund & Return Policy" content={legal.refund} />;
}
