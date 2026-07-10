'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader } from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

interface Store { id: string; name: string; whatsappNumber?: string | null; currency: string; logoUrl?: string | null }

export default function StoreSettingsPage() {
  const [s, setS] = useState<Store | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { api.get<Store>('/admin/store').then(setS).catch(() => undefined); }, []);

  async function save() {
    if (!s) return;
    await api.put('/admin/store', { name: s.name, whatsappNumber: s.whatsappNumber, currency: s.currency, logoUrl: s.logoUrl });
    setMsg('Saved');
  }

  if (!s) return <p className="text-slate-400">Loading…</p>;
  return (
    <div className="max-w-xl">
      <PageHeader title="Store settings" />
      <Card className="space-y-4">
        <Input label="Store name" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
        <Input label="WhatsApp number (e.g. 919876543210)" value={s.whatsappNumber ?? ''} onChange={(e) => setS({ ...s, whatsappNumber: e.target.value })} />
        <Input label="Currency" value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} />
        <ImageUploader label="Store logo" value={s.logoUrl ? [s.logoUrl] : []} onChange={(urls) => setS({ ...s, logoUrl: urls[0] ?? null })} />
        <div className="flex items-center gap-3"><Button onClick={save}>Save</Button>{msg && <span className="text-sm text-emerald-600">{msg}</span>}</div>
      </Card>
    </div>
  );
}
