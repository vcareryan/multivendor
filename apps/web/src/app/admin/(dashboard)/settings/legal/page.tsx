'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, PageHeader, Textarea, Toggle } from '@/components/admin/ui';

interface Settings {
  showPolicies?: boolean | null;
  privacyPolicy?: string | null;
  termsConditions?: string | null;
  refundPolicy?: string | null;
}
interface Store { settings?: Settings | null }

export default function LegalSettingsPage() {
  const [form, setForm] = useState({ showPolicies: false, privacyPolicy: '', termsConditions: '', refundPolicy: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Store>('/admin/store').then((s) => {
      const g = s.settings ?? {};
      setForm({
        showPolicies: g.showPolicies ?? false,
        privacyPolicy: g.privacyPolicy ?? '',
        termsConditions: g.termsConditions ?? '',
        refundPolicy: g.refundPolicy ?? '',
      });
    }).catch(() => undefined);
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/admin/store/settings', {
        showPolicies: form.showPolicies,
        privacyPolicy: form.privacyPolicy || null,
        termsConditions: form.termsConditions || null,
        refundPolicy: form.refundPolicy || null,
      });
      setMsg('Saved. Refresh your storefront to see the changes.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Legal & policy pages" action={<Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>} />
      {msg && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</p>}

      <Card className="space-y-2">
        <Toggle label="Show policy pages on my storefront" checked={form.showPolicies} onChange={(v) => setForm({ ...form, showPolicies: v })} />
        <p className="text-xs text-slate-400">
          Payment gateways (Razorpay, Stripe, PayPal) usually <strong>require</strong> a Privacy Policy, Terms &amp; Conditions
          and Refund/Return policy. Turn this on if you accept online payments. If you only take orders via WhatsApp, you can
          leave it off — the pages and links won&apos;t appear. Only pages with content below will be linked.
        </p>
      </Card>

      <Card className="space-y-2">
        <Textarea label="Privacy Policy" rows={8} value={form.privacyPolicy} onChange={(e) => setForm({ ...form, privacyPolicy: e.target.value })} placeholder="Explain what customer data you collect and how you use it…" />
      </Card>
      <Card className="space-y-2">
        <Textarea label="Terms & Conditions" rows={8} value={form.termsConditions} onChange={(e) => setForm({ ...form, termsConditions: e.target.value })} placeholder="Your terms of sale, usage, liability…" />
      </Card>
      <Card className="space-y-2">
        <Textarea label="Refund & Return Policy" rows={8} value={form.refundPolicy} onChange={(e) => setForm({ ...form, refundPolicy: e.target.value })} placeholder="Your refund, return and cancellation terms…" />
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save policies'}</Button>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
      </div>
    </div>
  );
}
