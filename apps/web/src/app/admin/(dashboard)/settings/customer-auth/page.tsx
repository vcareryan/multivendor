'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Toggle } from '@/components/admin/ui';

const METHODS = ['GOOGLE', 'WHATSAPP_OTP', 'SMS_OTP', 'PHONE_SIMPLE', 'GUEST'] as const;

interface AuthSettings {
  enabledMethods: string[];
  defaultMethod?: string | null;
  otpTtlSeconds: number;
  otpMaxRetries: number;
  otpResendDelaySeconds: number;
}

export default function CustomerAuthPage() {
  const [s, setS] = useState<AuthSettings | null>(null);
  const [sms, setSms] = useState({ enabled: false, provider: 'MSG91', apiKey: '', senderId: '', templateId: '', countryCode: '91', mode: 'TEST', hasApiKey: false });
  const [wa, setWa] = useState({ enabled: false, provider: 'META_CLOUD', apiToken: '', phoneNumberId: '', businessAccountId: '', otpTemplateName: '', languageCode: 'en', mode: 'TEST', hasApiToken: false });
  const [google, setGoogle] = useState({ enabled: false, clientId: '', clientSecret: '', callbackUrl: '', hasClientSecret: false });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<AuthSettings>('/admin/customer-auth-settings').then(setS).catch(() => undefined);
    api.get<typeof sms>('/admin/sms-settings').then((d) => setSms((p) => ({ ...p, ...d, apiKey: '' }))).catch(() => undefined);
    api.get<typeof wa>('/admin/whatsapp-settings').then((d) => setWa((p) => ({ ...p, ...d, apiToken: '' }))).catch(() => undefined);
    api.get<typeof google>('/admin/google-auth-settings').then((d) => setGoogle((p) => ({ ...p, ...d, clientSecret: '' }))).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMethod(m: string, on: boolean) {
    if (!s) return;
    const set = new Set(s.enabledMethods);
    if (on) set.add(m); else set.delete(m);
    setS({ ...s, enabledMethods: [...set] });
  }

  async function saveAll() {
    setMsg(null);
    if (s) await api.put('/admin/customer-auth-settings', s);
    await api.put('/admin/sms-settings', { ...sms, apiKey: sms.apiKey || undefined });
    await api.put('/admin/whatsapp-settings', { ...wa, apiToken: wa.apiToken || undefined });
    await api.put('/admin/google-auth-settings', { ...google, clientSecret: google.clientSecret || undefined, allowedRedirectDomains: [] });
    setMsg('All customer verification settings saved.');
  }

  if (!s) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Customer verification" />

      <Card>
        <h2 className="mb-2 font-medium">Enabled methods</h2>
        {METHODS.map((m) => (
          <Toggle key={m} label={m} checked={s.enabledMethods.includes(m)} onChange={(v) => toggleMethod(m, v)} />
        ))}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Input label="OTP expiry (sec)" type="number" value={s.otpTtlSeconds} onChange={(e) => setS({ ...s, otpTtlSeconds: +e.target.value })} />
          <Input label="Max retries" type="number" value={s.otpMaxRetries} onChange={(e) => setS({ ...s, otpMaxRetries: +e.target.value })} />
          <Input label="Resend delay (sec)" type="number" value={s.otpResendDelaySeconds} onChange={(e) => setS({ ...s, otpResendDelaySeconds: +e.target.value })} />
        </div>
      </Card>

      <Card>
        <Toggle label="SMS OTP (MSG91)" checked={sms.enabled} onChange={(v) => setSms({ ...sms, enabled: v })} />
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <Input label={`API key ${sms.hasApiKey ? '(set)' : ''}`} type="password" value={sms.apiKey} onChange={(e) => setSms({ ...sms, apiKey: e.target.value })} />
          <Input label="Sender ID" value={sms.senderId} onChange={(e) => setSms({ ...sms, senderId: e.target.value })} />
          <Input label="Template ID" value={sms.templateId} onChange={(e) => setSms({ ...sms, templateId: e.target.value })} />
          <Input label="Country code" value={sms.countryCode} onChange={(e) => setSms({ ...sms, countryCode: e.target.value })} />
        </div>
      </Card>

      <Card>
        <Toggle label="WhatsApp OTP (Meta Cloud API)" checked={wa.enabled} onChange={(v) => setWa({ ...wa, enabled: v })} />
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <Input label={`API token ${wa.hasApiToken ? '(set)' : ''}`} type="password" value={wa.apiToken} onChange={(e) => setWa({ ...wa, apiToken: e.target.value })} />
          <Input label="Phone number ID" value={wa.phoneNumberId} onChange={(e) => setWa({ ...wa, phoneNumberId: e.target.value })} />
          <Input label="OTP template name" value={wa.otpTemplateName} onChange={(e) => setWa({ ...wa, otpTemplateName: e.target.value })} />
          <Input label="Language code" value={wa.languageCode} onChange={(e) => setWa({ ...wa, languageCode: e.target.value })} />
        </div>
      </Card>

      <Card>
        <Toggle label="Google Sign-In" checked={google.enabled} onChange={(v) => setGoogle({ ...google, enabled: v })} />
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <Input label="Client ID" value={google.clientId} onChange={(e) => setGoogle({ ...google, clientId: e.target.value })} />
          <Input label={`Client secret ${google.hasClientSecret ? '(set)' : ''}`} type="password" value={google.clientSecret} onChange={(e) => setGoogle({ ...google, clientSecret: e.target.value })} />
          <Input label="Callback URL" value={google.callbackUrl} onChange={(e) => setGoogle({ ...google, callbackUrl: e.target.value })} />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={saveAll}>Save all</Button>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
      </div>
    </div>
  );
}
