'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Card, PageHeader } from '@/components/admin/ui';

interface Plan { id: string; tier: string; name: string; priceMinor: number; limits: Record<string, unknown>; isActive: boolean }

export default function SystemPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => { api.get<Plan[]>('/super/plans').then(setPlans).catch(() => undefined); }, []);

  return (
    <div>
      <PageHeader title="Subscription plans" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.id}>
            <p className="font-medium">{p.name}</p>
            <p className="text-2xl font-semibold">{p.priceMinor === 0 ? 'Free' : `₹${(p.priceMinor / 100).toFixed(0)}`}</p>
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(p.limits, null, 2)}</pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
