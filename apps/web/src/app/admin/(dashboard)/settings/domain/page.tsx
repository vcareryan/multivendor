'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader } from '@/components/admin/ui';

interface Domain { id: string; hostname: string; type: string; status: string; isPrimary: boolean; failureReason?: string | null }
interface Instructions { hostname: string; dns: { type: string; name: string; value: string; purpose: string }[] }

export default function DomainSettingsPage() {
  const [rows, setRows] = useState<Domain[]>([]);
  const [hostname, setHostname] = useState('');
  const [instr, setInstr] = useState<Instructions | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Domain[]>('/admin/domains').then(setRows).catch((e) => setError((e as Error).message));
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const d = await api.post<Domain>('/admin/domains', { hostname });
      setHostname('');
      await load();
      const i = await api.get<Instructions>(`/admin/domains/${d.id}/instructions`);
      setInstr(i);
    } catch (e) { setError((e as Error).message); }
  }

  async function verify(id: string) { await api.post(`/admin/domains/${id}/verify`); await load(); }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Custom domain" />
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <Card className="mb-4">
        <form onSubmit={add} className="flex gap-2">
          <div className="flex-1"><Input placeholder="www.mystore.com" value={hostname} onChange={(e) => setHostname(e.target.value)} /></div>
          <Button type="submit">Add domain</Button>
        </form>
      </Card>

      {instr && (
        <Card className="mb-4">
          <h3 className="mb-2 font-medium">DNS records for {instr.hostname}</h3>
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th>Type</th><th>Name</th><th>Value</th></tr></thead>
            <tbody>{instr.dns.map((r, i) => (<tr key={i} className="border-t border-slate-100"><td className="py-1">{r.type}</td><td className="break-all">{r.name}</td><td className="break-all">{r.value}</td></tr>))}</tbody>
          </table>
        </Card>
      )}

      <Card>
        <ul className="divide-y divide-slate-100">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2">
              <span>{d.hostname} {d.isPrimary && <span className="text-xs text-emerald-600">(primary)</span>}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${d.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : d.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
              {d.type === 'CUSTOM' && d.status !== 'VERIFIED' && <button onClick={() => verify(d.id)} className="text-sm text-emerald-600">Verify</button>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
