import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiServer } from '@/lib/api';
import { LegalArticle } from '@/components/storefront/LegalArticle';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Privacy Policy' };

interface Legal { privacy: string | null; terms: string | null; refund: string | null }

export default async function PrivacyPage() {
  const legal = await apiServer<Legal>('/store/legal').catch(() => null);
  if (!legal?.privacy) notFound();
  return <LegalArticle title="Privacy Policy" content={legal.privacy} />;
}
