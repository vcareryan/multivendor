'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Select, Toggle } from '@/components/admin/ui';

interface Limits {
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxStaffUsers: number;
  storageMb: number;
  customDomain: boolean;
  premiumThemes: boolean;
  reports: boolean;
  onlinePayments: boolean;
}
interface Plan { id: string; tier: string; name: string; priceMinor: number; limits: Partial<Limits>; isActive: boolean }

const ALL_TIERS = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'];
const DEFAULT_LIMITS: Limits = {
  maxProducts: 30, maxOrdersPerMonth: 100, maxStaffUsers: 1, storageMb: 100,
  customDomain: false, premiumThemes: false, reports: false, onlinePayments: false,
};

const num = (v?: number) => (v === -1 ? '∞' : (v ?? 0).toLocaleString());
const yn = (b?: boolean) => (b ? 'Yes' : 'No');

interface EditState { tier: string; name: string; priceMajor: string; isActive: boolean; limits: Limits }

function LimitNumber({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const unlimited = value === -1;
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          disabled={unlimited}
          value={unlimited ? '' : value}
          onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
          placeholder={unlimited ? '∞ Unlimited' : ''}
          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-100"
        />
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input type="checkbox" checked={unlimited} onChange={(e) => onChange(e.target.checked ? -1 : 0)} /> Unlimited
        </label>
      </div>
    </div>
  );
}

export default function SystemPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => api.get<Plan[]>('/super/plans').then(setPlans).catch((e) => setErr((e as Error).message));
  useEffect(() => { load(); }, []);

  function startEdit(p: Plan) {
    setMsg(null); setErr(null);
    setEdit({
      tier: p.tier,
      name: p.name,
      priceMajor: (p.priceMinor / 100).toString(),
      isActive: p.isActive,
      limits: { ...DEFAULT_LIMITS, ...p.limits },
    });
  }
  function startNew(tier: string) {
    setMsg(null); setErr(null);
    setEdit({ tier, name: tier.charAt(0) + tier.slice(1).toLowerCase(), priceMajor: '0', isActive: true, limits: { ...DEFAULT_LIMITS } });
  }

  async function save() {
    if (!edit) return;
    setErr(null);
    try {
      await api.put(`/super/plans/${edit.tier}`, {
        name: edit.name,
        priceMinor: Math.round(parseFloat(edit.priceMajor || '0') * 100),
        limits: { tier: edit.tier, ...edit.limits },
        isActive: edit.isActive,
      });
      setEdit(null);
      setMsg('Plan saved.');
      await load();
    } catch (e) { setErr((e as Error).message); }
  }

  async function remove(tier: string) {
    if (!confirm(`Delete the ${tier} plan? This is blocked if any store is using it.`)) return;
    setErr(null);
    try {
      await api.delete(`/super/plans/${tier}`);
      setMsg('Plan deleted.');
      await load();
    } catch (e) { setErr((e as Error).message); }
  }

  const missing = ALL_TIERS.filter((t) => !plans.some((p) => p.tier === t));

  function setLimit<K extends keyof Limits>(k: K, v: Limits[K]) {
    setEdit((e) => (e ? { ...e, limits: { ...e.limits, [k]: v } } : e));
  }

  return (
    <div>
      <PageHeader
        title="Subscription plans"
        action={missing.length > 0 ? (
          <Select value="" onChange={(e) => e.target.value && startNew(e.target.value)}>
            <option value="">+ New plan…</option>
            {missing.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        ) : undefined}
      />
      {msg && <p className="mb-3 rounded bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</p>}

      {edit && (
        <Card className="mb-5 space-y-4">
          <h2 className="font-medium text-slate-800">{plans.some((p) => p.tier === edit.tier) ? 'Edit' : 'New'} plan · {edit.tier}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Plan name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Input label="Price (₹ / month, 0 = Free)" type="number" step="1" value={edit.priceMajor} onChange={(e) => setEdit({ ...edit, priceMajor: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <LimitNumber label="Max products" value={edit.limits.maxProducts} onChange={(v) => setLimit('maxProducts', v)} />
            <LimitNumber label="Orders / month" value={edit.limits.maxOrdersPerMonth} onChange={(v) => setLimit('maxOrdersPerMonth', v)} />
            <LimitNumber label="Staff users" value={edit.limits.maxStaffUsers} onChange={(v) => setLimit('maxStaffUsers', v)} />
            <LimitNumber label="Storage (MB)" value={edit.limits.storageMb} onChange={(v) => setLimit('storageMb', v)} />
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            <Toggle label="Custom domain" checked={edit.limits.customDomain} onChange={(v) => setLimit('customDomain', v)} />
            <Toggle label="Premium themes" checked={edit.limits.premiumThemes} onChange={(v) => setLimit('premiumThemes', v)} />
            <Toggle label="Reports" checked={edit.limits.reports} onChange={(v) => setLimit('reports', v)} />
            <Toggle label="Online payments" checked={edit.limits.onlinePayments} onChange={(v) => setLimit('onlinePayments', v)} />
            <Toggle label="Plan active (visible to stores)" checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save}>Save plan</Button>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const l = { ...DEFAULT_LIMITS, ...p.limits };
          const rows: [string, string][] = [
            ['Products', num(l.maxProducts)],
            ['Orders / month', num(l.maxOrdersPerMonth)],
            ['Staff users', num(l.maxStaffUsers)],
            ['Storage', l.storageMb === -1 ? '∞' : `${l.storageMb} MB`],
            ['Custom domain', yn(l.customDomain)],
            ['Premium themes', yn(l.premiumThemes)],
            ['Reports', yn(l.reports)],
            ['Online payments', yn(l.onlinePayments)],
          ];
          return (
            <Card key={p.id} className={p.isActive ? '' : 'opacity-60'}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-2xl font-semibold">{p.priceMinor === 0 ? 'Free' : `₹${(p.priceMinor / 100).toFixed(0)}`}</p>
                </div>
                {!p.isActive && <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Hidden</span>}
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-50 py-0.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => startEdit(p)}>Edit</Button>
                <Button variant="danger" onClick={() => remove(p.tier)}>Delete</Button>
              </div>
            </Card>
          );
        })}
        {plans.length === 0 && <p className="text-slate-400">No plans.</p>}
      </div>
    </div>
  );
}
