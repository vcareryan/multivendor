import Link from 'next/link';
import { apiServer } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface OrderView {
  id: string;
  orderNumber: string;
  status: string;
  totalMinor: number;
  currency: string;
}

export default async function OrderSuccessPage({ params }: { params: { id: string } }) {
  const order = await apiServer<OrderView>(`/store/orders/${params.id}`).catch(() => null);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
      <h1 className="font-heading text-2xl font-semibold">Thank you for your order</h1>
      {order && (
        <p className="mt-2 text-[rgb(var(--color-muted))]">
          Order <span className="font-medium text-slate-900">#{order.orderNumber}</span> — status: {order.status}
        </p>
      )}
      <p className="mt-3 text-sm text-[rgb(var(--color-muted))]">Save your order number to track your order.</p>
      <Link href="/" className="mt-6 inline-block rounded-theme bg-brand px-5 py-2.5 text-brand-fg">Continue shopping</Link>
    </div>
  );
}
