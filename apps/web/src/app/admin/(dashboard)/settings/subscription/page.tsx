'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, PageHeader } from '@/components/admin/ui';

interface Current {
  tier: string;
  limits: { maxProducts: number; maxOrdersPerMonth: number; maxStaffUsers: number; customDomain: boolean; reports: boolean; onlinePayments: boolean };
  usage: { products: number; staff: number; ordersThisMonth: number };
}
interface Plan { id: string; tier: string; name: string; priceMinor: number }

export default function SubscriptionPage() {
  const [cur, setCur] = useState<Current | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => api.get<Current>('/admin/subscription').then(setCur).catch(() => undefined);
  useEffect(() => { load(); api.get<Plan[]>('/plans').then(setPlans).catch(() => undefined); }, []);

  async function change(tier: string) {
    await api.put('/admin/subscription', { tier });
    setMsg(`Switched to ${tier}`);
    await load();
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Subscription" />
      {cur && (
        <Card className="mb-4">
          <p className="text-lg font-medium">Current plan: {cur.tier}</p>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <div>Products: {cur.usage.products}/{cur.limits.maxProducts === -1 ? '∞' : cur.limits.maxProducts}</div>
            <div>Staff: {cur.usage.staff}/{cur.limits.maxStaffUsers === -1 ? '∞' : cur.limits.maxStaffUsers}</div>
            <div>Orders (mo): {cur.usage.ordersThisMonth}/{cur.limits.maxOrdersPerMonth === -1 ? '∞' : cur.limits.maxOrdersPerMonth}</div>
          </div>
        </Card>
      )}
      {msg && <p className="mb-3 text-sm text-emerald-600">{msg}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <p className="font-medium">{p.name}</p>
            <p className="text-2xl font-semibold">{p.priceMinor === 0 ? 'Free' : `₹${(p.priceMinor / 100).toFixed(0)}/mo`}</p>
            <Button className="mt-3" variant={cur?.tier === p.tier ? 'outline' : 'primary'} onClick={() => change(p.tier)}>
              {cur?.tier === p.tier ? 'Current' : 'Switch'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
