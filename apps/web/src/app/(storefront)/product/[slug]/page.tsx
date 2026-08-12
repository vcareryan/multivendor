import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';
import { ProductDetail, type ProductDetailData } from '@/components/storefront/ProductDetail';

export const dynamic = 'force-dynamic';

async function getProduct(slug: string): Promise<ProductDetailData | null> {
  return apiServer<ProductDetailData>(`/catalog/products/${encodeURIComponent(slug)}`).catch(() => null);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: 'Product' };
  const description =
    (product as { description?: string | null }).description?.slice(0, 300) || `Buy ${product.name} online.`;
  const image = product.images?.[0]?.url;
  return {
    title: product.name,
    description,
    openGraph: { title: product.name, description, type: 'website', images: image ? [image] : [] },
    twitter: { card: 'summary_large_image', title: product.name, description, images: image ? [image] : [] },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [config, product] = await Promise.all([
    apiServer<StorefrontConfig>('/store/config').catch(() => null),
    getProduct(params.slug),
  ]);
  if (!config || !product) notFound();

  return <ProductDetail product={product} currency={config.store.currency} />;
}
