'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader } from '@/components/admin/ui';

interface Domain { id: string; hostname: string; type: string; status: string; isPrimary: boolean; failureReason?: string | null }
interface Instructions { hostname: string; status?: string; dns: { type: string; name: string; value: string; purpose: string }[] }

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'utanshop.com';

export default function DomainSettingsPage() {
  const [rows, setRows] = useState<Domain[]>([]);
  const [slug, setSlug] = useState<string>('');
  const [hostname, setHostname] = useState('');
  const [instr, setInstr] = useState<Instructions | null>(null);
  const [instrById, setInstrById] = useState<Record<string, Instructions>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Domain[]>('/admin/domains').then(setRows).catch((e) => setError((e as Error).message));
  useEffect(() => {
    load();
    api.get<{ slug: string }>('/admin/store').then((s) => setSlug(s.slug)).catch(() => undefined);
  }, []);

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

  async function verify(id: string) {
    setError(null);
    setBusy(id);
    try {
      const updated = await api.post<Domain>(`/admin/domains/${id}/verify`);
      await load();
      // Make sure the DNS records (with the correct token) stay visible if it
      // still failed, so the owner can compare against their DNS provider.
      if (updated.status !== 'VERIFIED') await showRecords(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function makePrimary(id: string) {
    setError(null);
    setBusy(id);
    try { await api.post(`/admin/domains/${id}/primary`); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  async function showRecords(id: string) {
    try {
      const i = await api.get<Instructions>(`/admin/domains/${id}/instructions`);
      setInstrById((m) => ({ ...m, [id]: i }));
    } catch (e) { setError((e as Error).message); }
  }

  function toggleRecords(id: string) {
    if (instrById[id]) { setInstrById((m) => { const n = { ...m }; delete n[id]; return n; }); }
    else void showRecords(id);
  }

  // Best public URL: primary verified custom domain → any verified domain → system subdomain.
  const primary = rows.find((d) => d.isPrimary && d.status === 'VERIFIED') ?? rows.find((d) => d.status === 'VERIFIED');
  const previewUrl = slug ? `https://${slug}.${BASE_DOMAIN}` : null;
  const storeUrl = primary ? `https://${primary.hostname}` : previewUrl;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Custom domain"
        action={
          storeUrl ? (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Visit your store ↗
            </a>
          ) : undefined
        }
      />
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {previewUrl && (
        <Card className="mb-4">
          <p className="text-sm text-slate-500">Your store is always available at this free address:</p>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all font-medium text-emerald-700 hover:underline">
            {previewUrl} ↗
          </a>
        </Card>
      )}

      <Card className="mb-4">
        <form onSubmit={add} className="flex gap-2">
          <div className="flex-1"><Input placeholder="www.mystore.com" value={hostname} onChange={(e) => setHostname(e.target.value)} /></div>
          <Button type="submit">Add domain</Button>
        </form>
      </Card>

      {instr && (
        <Card className="mb-4">
          <h3 className="mb-2 font-medium">DNS records for {instr.hostname}</h3>
          <DnsTable dns={instr.dns} />
        </Card>
      )}

      <Card>
        <ul className="divide-y divide-slate-100">
          {rows.map((d) => (
            <li key={d.id} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a href={`https://${d.hostname}`} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:underline">
                  {d.hostname} ↗
                  {d.isPrimary && <span className="ml-1 text-xs text-slate-400">(primary)</span>}
                </a>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${d.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : d.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                  {d.type === 'CUSTOM' && (
                    <button onClick={() => toggleRecords(d.id)} className="text-sm text-slate-500 hover:text-slate-700">
                      {instrById[d.id] ? 'Hide DNS' : 'DNS records'}
                    </button>
                  )}
                  {d.type === 'CUSTOM' && d.status === 'VERIFIED' && !d.isPrimary && (
                    <button onClick={() => makePrimary(d.id)} disabled={busy === d.id} className="text-sm text-emerald-600 disabled:opacity-50">
                      Make primary
                    </button>
                  )}
                  {d.type === 'CUSTOM' && d.status !== 'VERIFIED' && (
                    <button onClick={() => verify(d.id)} disabled={busy === d.id} className="text-sm text-emerald-600 disabled:opacity-50">
                      {busy === d.id ? 'Verifying…' : 'Verify'}
                    </button>
                  )}
                </div>
              </div>

              {d.status === 'FAILED' && d.failureReason && (
                <p className="mt-1 text-xs text-red-500">{d.failureReason}</p>
              )}

              {instrById[d.id] && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs text-slate-500">
                    Add these records at your DNS provider. Point traffic <strong>directly to the server</strong> and keep the
                    proxy <strong>OFF</strong> (in Cloudflare use the grey cloud / “DNS only”) so HTTPS can be issued automatically.
                  </p>
                  <DnsTable dns={instrById[d.id].dns} />
                </div>
              )}
            </li>
          ))}
          {rows.length === 0 && <li className="py-4 text-center text-sm text-slate-400">No custom domains yet. Your store is live at the address above.</li>}
        </ul>
      </Card>
    </div>
  );
}

function DnsTable({ dns }: { dns: Instructions['dns'] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-slate-500"><tr><th className="pr-2">Type</th><th className="pr-2">Name</th><th>Value</th></tr></thead>
      <tbody>
        {dns.map((r, i) => (
          <tr key={i} className="border-t border-slate-100 align-top">
            <td className="py-1 pr-2">{r.type}</td>
            <td className="break-all pr-2 font-mono text-xs">{r.name}</td>
            <td className="break-all font-mono text-xs">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
