'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Textarea } from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

interface Settings {
  about?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialLinks?: { instagram?: string; facebook?: string } | null;
}
interface Store { id: string; name: string; whatsappNumber?: string | null; currency: string; logoUrl?: string | null; settings?: Settings | null }

export default function StoreSettingsPage() {
  const [s, setS] = useState<Store | null>(null);
  const [info, setInfo] = useState<Settings>({});
  const [social, setSocial] = useState({ instagram: '', facebook: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Store>('/admin/store').then((store) => {
      setS(store);
      const g = store.settings ?? {};
      setInfo(g);
      setSocial({ instagram: g.socialLinks?.instagram ?? '', facebook: g.socialLinks?.facebook ?? '' });
    }).catch(() => undefined);
  }, []);

  async function save() {
    if (!s) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/admin/store', { name: s.name, whatsappNumber: s.whatsappNumber, currency: s.currency, logoUrl: s.logoUrl });
      await api.put('/admin/store/settings', {
        about: info.about || null,
        address: info.address || null,
        city: info.city || null,
        state: info.state || null,
        pincode: info.pincode || null,
        contactEmail: info.contactEmail || null,
        contactPhone: info.contactPhone || null,
        socialLinks: { instagram: social.instagram || undefined, facebook: social.facebook || undefined },
      });
      setMsg('Saved. Refresh your storefront to see the changes.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!s) return <p className="text-slate-400">Loading…</p>;
  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Store settings" action={<Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>} />
      {msg && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</p>}

      <Card className="space-y-4">
        <h2 className="font-medium text-slate-800">Profile</h2>
        <Input label="Store name" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
        <Input label="WhatsApp number (e.g. 919876543210)" value={s.whatsappNumber ?? ''} onChange={(e) => setS({ ...s, whatsappNumber: e.target.value })} />
        <Input label="Currency" value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} />
        <ImageUploader label="Store logo" recommended="256×256" value={s.logoUrl ? [s.logoUrl] : []} onChange={(urls) => setS({ ...s, logoUrl: urls[0] ?? null })} />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-medium text-slate-800">About Us</h2>
          <p className="text-xs text-slate-400">Shown on your storefront&apos;s About page. Leave blank to use a default message.</p>
        </div>
        <Textarea label="About your store" rows={5} value={info.about ?? ''} onChange={(e) => setInfo({ ...info, about: e.target.value })} placeholder="Tell customers about your store, history, specialities…" />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-medium text-slate-800">Contact details</h2>
          <p className="text-xs text-slate-400">Shown on your storefront&apos;s Contact page.</p>
        </div>
        <Textarea label="Address" rows={2} value={info.address ?? ''} onChange={(e) => setInfo({ ...info, address: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="City" value={info.city ?? ''} onChange={(e) => setInfo({ ...info, city: e.target.value })} />
          <Input label="State" value={info.state ?? ''} onChange={(e) => setInfo({ ...info, state: e.target.value })} />
          <Input label="Pincode" value={info.pincode ?? ''} onChange={(e) => setInfo({ ...info, pincode: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Contact email" type="email" value={info.contactEmail ?? ''} onChange={(e) => setInfo({ ...info, contactEmail: e.target.value })} />
          <Input label="Contact phone" value={info.contactPhone ?? ''} onChange={(e) => setInfo({ ...info, contactPhone: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Instagram URL" value={social.instagram} onChange={(e) => setSocial({ ...social, instagram: e.target.value })} />
          <Input label="Facebook URL" value={social.facebook} onChange={(e) => setSocial({ ...social, facebook: e.target.value })} />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
      </div>
    </div>
  );
}
