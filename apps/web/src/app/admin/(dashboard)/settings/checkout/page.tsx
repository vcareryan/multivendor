'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, PageHeader, Select, Toggle } from '@/components/admin/ui';

interface CheckoutSettings {
  mode: string;
  requireLogin: boolean;
  requireOtpBeforeAddress: boolean;
  allowGuest: boolean;
  emailRequirement: string;
  defaultChannel?: string | null;
}

export default function CheckoutSettingsPage() {
  const [s, setS] = useState<CheckoutSettings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.get<CheckoutSettings>('/admin/checkout-settings').then(setS).catch((e) => setErr((e as Error).message)); }, []);

  async function save() {
    if (!s) return;
    setMsg(null); setErr(null);
    try {
      await api.put('/admin/checkout-settings', s);
      setMsg('Saved');
    } catch (e) { setErr((e as Error).message); }
  }

  if (!s) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="max-w-xl">
      <PageHeader title="Checkout settings" />
      <Card className="space-y-4">
        <Select label="Checkout method" value={s.mode} onChange={(e) => setS({ ...s, mode: e.target.value })}>
          <option value="WHATSAPP_ONLY">WhatsApp order only</option>
          <option value="PAYMENT_ONLY">Online payment only</option>
          <option value="BOTH">Both (customer chooses)</option>
        </Select>
        <Select label="Email requirement" value={s.emailRequirement} onChange={(e) => setS({ ...s, emailRequirement: e.target.value })}>
          <option value="NOT_NEEDED">Not needed</option>
          <option value="OPTIONAL">Optional</option>
          <option value="REQUIRED">Required</option>
        </Select>
        <Toggle label="Require customer login before checkout" checked={s.requireLogin} onChange={(v) => setS({ ...s, requireLogin: v })} />
        <Toggle label="Require OTP before entering address" checked={s.requireOtpBeforeAddress} onChange={(v) => setS({ ...s, requireOtpBeforeAddress: v })} />
        <Toggle label="Allow guest checkout" checked={s.allowGuest} onChange={(v) => setS({ ...s, allowGuest: v })} />
        <div className="flex items-center gap-3">
          <Button onClick={save}>Save</Button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </Card>
    </div>
  );
}
