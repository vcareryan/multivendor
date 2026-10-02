'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Textarea, Toggle } from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

interface StoreWithSettings {
  settings?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string | null;
    ogImageUrl?: string | null;
    googleSiteVerification?: string | null;
    noindex?: boolean | null;
  } | null;
}

export default function SeoSettingsPage() {
  const [form, setForm] = useState({
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    ogImageUrl: '',
    googleSiteVerification: '',
    noindex: false,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<StoreWithSettings>('/admin/store').then((s) => {
      const g = s.settings ?? {};
      setForm({
        metaTitle: g.metaTitle ?? '',
        metaDescription: g.metaDescription ?? '',
        metaKeywords: g.metaKeywords ?? '',
        ogImageUrl: g.ogImageUrl ?? '',
        googleSiteVerification: g.googleSiteVerification ?? '',
        noindex: g.noindex ?? false,
      });
    }).catch(() => undefined);
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/admin/store/settings', {
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        metaKeywords: form.metaKeywords || null,
        ogImageUrl: form.ogImageUrl || null,
        googleSiteVerification: form.googleSiteVerification || null,
        noindex: form.noindex,
      });
      setMsg('SEO settings saved. Refresh your storefront to update tags.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="SEO & Google" action={<Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>} />
      {msg && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</p>}

      <Card className="space-y-4">
        <h2 className="font-medium text-slate-800">Search engine listing</h2>
        <Input label="Meta title (browser tab + Google title)" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} placeholder="e.g. Rajesh Shop — Fresh groceries in Kochi" />
        <Textarea label="Meta description (Google snippet, ~155 chars)" value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={3} />
        <Input label="Keywords (comma separated)" value={form.metaKeywords} onChange={(e) => setForm({ ...form, metaKeywords: e.target.value })} placeholder="groceries, vegetables, home delivery" />
        <ImageUploader label="Social share image (Open Graph — shown on WhatsApp/Facebook links)" recommended="1200×630" value={form.ogImageUrl ? [form.ogImageUrl] : []} onChange={(urls) => setForm({ ...form, ogImageUrl: urls[0] ?? '' })} />
      </Card>

      <Card className="space-y-3">
        <h2 className="font-medium text-slate-800">Google Search Console</h2>
        <p className="text-sm text-slate-500">
          In Google Search Console, add your property using the <strong>HTML tag</strong> method. Copy only the
          <code className="mx-1 rounded bg-slate-100 px-1">content</code> value from the tag it gives you
          (<code>&lt;meta name=&quot;google-site-verification&quot; content=&quot;THIS_VALUE&quot;&gt;</code>) and paste it below, then Save and click Verify in Google.
        </p>
        <Input label="Google site verification code" value={form.googleSiteVerification} onChange={(e) => setForm({ ...form, googleSiteVerification: e.target.value })} placeholder="e.g. Abc123..." />
      </Card>

      <Card className="space-y-2">
        <h2 className="font-medium text-slate-800">Indexing</h2>
        <Toggle label="Hide this store from search engines (noindex)" checked={form.noindex} onChange={(v) => setForm({ ...form, noindex: v })} />
        <p className="text-xs text-slate-400">Turn on only if the store is not ready to be found on Google yet.</p>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save SEO settings'}</Button>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
      </div>
    </div>
  );
}
