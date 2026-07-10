import { notFound } from 'next/navigation';
import { apiServer } from '@/lib/api';
import type { StorefrontConfig } from '@utanstore/shared';
import { ProductDetail, type ProductDetailData } from '@/components/storefront/ProductDetail';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [config, product] = await Promise.all([
    apiServer<StorefrontConfig>('/store/config', { revalidate: 30 }).catch(() => null),
    apiServer<ProductDetailData>(`/catalog/products/${encodeURIComponent(params.slug)}`).catch(() => null),
  ]);
  if (!config || !product) notFound();

  return <ProductDetail product={product} currency={config.store.currency} />;
}
