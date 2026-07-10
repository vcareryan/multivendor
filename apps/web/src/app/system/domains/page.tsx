'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Card, PageHeader } from '@/components/admin/ui';

interface Domain { id: string; hostname: string; status: string; type: string; store?: { name: string; slug: string } | null }

export default function SystemDomainsPage() {
  const [rows, setRows] = useState<Domain[]>([]);
  useEffect(() => { api.get<Domain[]>('/super/domains').then(setRows).catch(() => undefined); }, []);

  return (
    <div>
      <PageHeader title="Domains" />
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Hostname</th><th>Store</th><th>Type</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="py-2">{d.hostname}</td><td>{d.store?.name ?? '—'}</td><td>{d.type}</td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs ${d.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
