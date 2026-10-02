'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Select, Toggle } from '@/components/admin/ui';

interface PaymentSettings {
  onlinePaymentEnabled: boolean;
  provider?: string | null;
  mode: string;
  currency: string;
  successUrl?: string | null;
  failureUrl?: string | null;
  keyId?: string | null;
  hasKeySecret?: boolean;
  hasWebhookSecret?: boolean;
}

export default function PaymentSettingsPage() {
  const [s, setS] = useState<PaymentSettings | null>(null);
  const [secrets, setSecrets] = useState({ keyId: '', keySecret: '', webhookSecret: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.get<PaymentSettings>('/admin/payment-settings').then(setS).catch((e) => setErr((e as Error).message)); }, []);

  async function save() {
    if (!s) return;
    setMsg(null); setErr(null);
    try {
      await api.put('/admin/payment-settings', {
        onlinePaymentEnabled: s.onlinePaymentEnabled,
        provider: s.provider || null,
        mode: s.mode,
        currency: s.currency,
        successUrl: s.successUrl || null,
        failureUrl: s.failureUrl || null,
        keyId: secrets.keyId || undefined,
        keySecret: secrets.keySecret || undefined,
        webhookSecret: secrets.webhookSecret || undefined,
      });
      setSecrets({ keyId: '', keySecret: '', webhookSecret: '' });
      setMsg('Saved — secrets are encrypted at rest.');
      const fresh = await api.get<PaymentSettings>('/admin/payment-settings');
      setS(fresh);
    } catch (e) { setErr((e as Error).message); }
  }

  if (!s) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="max-w-xl">
      <PageHeader title="Payment settings" />
      <Card className="space-y-4">
        <Toggle label="Enable online payment" checked={s.onlinePaymentEnabled} onChange={(v) => setS({ ...s, onlinePaymentEnabled: v })} />
        <Select label="Provider" value={s.provider ?? ''} onChange={(e) => setS({ ...s, provider: e.target.value })}>
          <option value="">— select —</option>
          <option value="RAZORPAY">Razorpay</option>
          <option value="STRIPE">Stripe</option>
          <option value="PAYPAL">PayPal</option>
        </Select>
        <Select label="Mode" value={s.mode} onChange={(e) => setS({ ...s, mode: e.target.value })}>
          <option value="TEST">Test</option>
          <option value="LIVE">Live</option>
        </Select>
        <Input label="Currency" value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} />
        <Input label={`Key ID ${s.keyId ? `(current: ${s.keyId})` : ''}`} placeholder="Enter to update" value={secrets.keyId} onChange={(e) => setSecrets({ ...secrets, keyId: e.target.value })} />
        <Input label={`Key secret ${s.hasKeySecret ? '(set)' : ''}`} type="password" placeholder="Enter to update" value={secrets.keySecret} onChange={(e) => setSecrets({ ...secrets, keySecret: e.target.value })} />
        <Input label={`Webhook secret ${s.hasWebhookSecret ? '(set)' : ''}`} type="password" placeholder="Enter to update" value={secrets.webhookSecret} onChange={(e) => setSecrets({ ...secrets, webhookSecret: e.target.value })} />
        <p className="text-xs text-slate-500">Webhook URL: <code>/api/v1/payments/webhook/{(s.provider ?? 'razorpay').toLowerCase()}</code></p>
        <div className="flex items-center gap-3">
          <Button onClick={save}>Save</Button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </Card>
    </div>
  );
}
