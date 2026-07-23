'use client';

import { useEffect, useState } from 'react';
import type { ThemeConfig, ThemeBanner } from '@utanstore/shared';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Select, Toggle } from '@/components/admin/ui';
import { ImageUploader } from '@/components/admin/ImageUploader';

interface Template { id: string; name: string; industry: string; isPremium: boolean }

const DEFAULTS: ThemeConfig = {
  layoutVariant: 'general.default',
  colors: { brand: '22 163 74', brandFg: '255 255 255', accent: '234 88 12', surface: '255 255 255', muted: '100 116 139', bg: '248 250 252', fg: '15 23 42' },
  fonts: { heading: 'Inter', body: 'Inter' },
  radius: '0.5rem',
  banners: [],
  categoryDisplayStyle: 'grid',
  productCardVariant: 'image-first',
  features: { weightBasedProducts: false, addons: false, preOrder: false, collections: false, offersSection: true },
};

const FONTS = ['Inter', 'Poppins', 'Montserrat', 'Roboto', 'Nunito', 'Playfair Display', 'Lora', 'Merriweather'];
const RADII = [
  { label: 'Square', value: '0' },
  { label: 'Small', value: '0.25rem' },
  { label: 'Medium', value: '0.5rem' },
  { label: 'Large', value: '0.75rem' },
  { label: 'Extra large', value: '1rem' },
];

function rgbToHex(rgb?: string): string {
  const parts = (rgb ?? '').trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '#000000';
  return '#' + parts.map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
}
function hexToRgb(hex: string): string {
  const m = hex.replace('#', '');
  return `${parseInt(m.slice(0, 2), 16)} ${parseInt(m.slice(2, 4), 16)} ${parseInt(m.slice(4, 6), 16)}`;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={rgbToHex(value)} onChange={(e) => onChange(hexToRgb(e.target.value))} className="h-9 w-12 rounded border border-slate-300" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" placeholder="R G B" />
      </div>
    </label>
  );
}

export default function ThemeSettingsPage() {
  const [cfg, setCfg] = useState<ThemeConfig | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function merge(raw: Partial<ThemeConfig> | undefined): ThemeConfig {
    return {
      ...DEFAULTS,
      ...raw,
      colors: { ...DEFAULTS.colors, ...(raw?.colors ?? {}) },
      fonts: { ...DEFAULTS.fonts, ...(raw?.fonts ?? {}) },
      features: { ...DEFAULTS.features, ...(raw?.features ?? {}) },
      banners: raw?.banners ?? [],
    };
  }

  async function reload() {
    const t = await api.get<{ config: Partial<ThemeConfig> }>('/admin/theme').catch(() => null);
    setCfg(merge(t?.config));
  }

  useEffect(() => {
    reload();
    api.get<Template[]>('/admin/theme/templates').then(setTemplates).catch(() => undefined);
  }, []);

  async function applyTemplate(id: string) {
    await api.post(`/admin/theme/apply/${id}`);
    await reload();
    setMsg('Template applied — remember to Save.');
  }

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/admin/theme', cfg);
      setMsg('Theme saved. Refresh your storefront to see it.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) {
    setCfg((c) => (c ? { ...c, [key]: value } : c));
  }
  function setColor(key: keyof ThemeConfig['colors'], value: string) {
    setCfg((c) => (c ? { ...c, colors: { ...c.colors, [key]: value } } : c));
  }
  function setFeature(key: keyof ThemeConfig['features'], value: boolean) {
    setCfg((c) => (c ? { ...c, features: { ...c.features, [key]: value } } : c));
  }
  function applyPreset(kind: 'light' | 'dark') {
    setCfg((c) => {
      if (!c) return c;
      const colors =
        kind === 'dark'
          ? { ...c.colors, bg: '15 23 42', fg: '241 245 249', surface: '30 41 59', muted: '148 163 184', brandFg: '255 255 255' }
          : { ...c.colors, bg: '248 250 252', fg: '15 23 42', surface: '255 255 255', muted: '100 116 139', brandFg: '255 255 255' };
      return { ...c, colors };
    });
  }

  // --- Banners ---
  function addBanner() {
    setCfg((c) =>
      c ? { ...c, banners: [...c.banners, { id: crypto.randomUUID(), imageUrl: '', title: '', subtitle: '', ctaLabel: '', ctaHref: '', position: c.banners.length }] } : c,
    );
  }
  function updateBanner(id: string, patch: Partial<ThemeBanner>) {
    setCfg((c) => (c ? { ...c, banners: c.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) } : c));
  }
  function removeBanner(id: string) {
    setCfg((c) => (c ? { ...c, banners: c.banners.filter((b) => b.id !== id) } : c));
  }

  if (!cfg) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Theme & storefront design"
        action={<Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save theme'}</Button>}
      />
      {msg && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</p>}

      <Card className="space-y-2">
        <Select label="Start from an industry template" onChange={(e) => e.target.value && applyTemplate(e.target.value)} defaultValue="">
          <option value="">— choose a template —</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.isPremium ? ' (Premium)' : ''}</option>)}
        </Select>
        <p className="text-xs text-slate-400">A template presets the layout, colors, fonts and features. You can then customise everything below.</p>
      </Card>

      <Card className="grid gap-3 sm:grid-cols-2">
        <Select label="Product card style" value={cfg.productCardVariant} onChange={(e) => set('productCardVariant', e.target.value as ThemeConfig['productCardVariant'])}>
          <option value="compact">Compact (dense grid — grocery)</option>
          <option value="image-first">Image-first (large photos — fashion)</option>
          <option value="detailed">Detailed (photo + description — menu/electronics)</option>
        </Select>
        <Select label="Category display" value={cfg.categoryDisplayStyle} onChange={(e) => set('categoryDisplayStyle', e.target.value as ThemeConfig['categoryDisplayStyle'])}>
          <option value="grid">Grid</option>
          <option value="tiles">Tiles (dense)</option>
          <option value="carousel">Carousel (scroll)</option>
          <option value="list">List</option>
        </Select>
        <Select label="Heading font" value={cfg.fonts.heading} onChange={(e) => setCfg((c) => (c ? { ...c, fonts: { ...c.fonts, heading: e.target.value } } : c))}>
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
        <Select label="Body font" value={cfg.fonts.body} onChange={(e) => setCfg((c) => (c ? { ...c, fonts: { ...c.fonts, body: e.target.value } } : c))}>
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
        <Select label="Corner rounding" value={cfg.radius} onChange={(e) => set('radius', e.target.value)}>
          {RADII.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Quick palette:</span>
          <Button variant="outline" onClick={() => applyPreset('light')}>Light</Button>
          <Button variant="outline" onClick={() => applyPreset('dark')}>Dark (app style)</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ColorField label="Brand color" value={cfg.colors.brand} onChange={(v) => setColor('brand', v)} />
          <ColorField label="Brand text (on brand)" value={cfg.colors.brandFg} onChange={(v) => setColor('brandFg', v)} />
          <ColorField label="Accent color" value={cfg.colors.accent} onChange={(v) => setColor('accent', v)} />
          <ColorField label="Page background" value={cfg.colors.bg ?? '248 250 252'} onChange={(v) => setColor('bg', v)} />
          <ColorField label="Page text" value={cfg.colors.fg ?? '15 23 42'} onChange={(v) => setColor('fg', v)} />
          <ColorField label="Surface (cards)" value={cfg.colors.surface} onChange={(v) => setColor('surface', v)} />
          <ColorField label="Muted text" value={cfg.colors.muted} onChange={(v) => setColor('muted', v)} />
        </div>
      </Card>

      <Card className="space-y-1">
        <h2 className="mb-2 font-medium text-slate-800">Storefront features</h2>
        <Toggle label="Offers / deals section" checked={cfg.features.offersSection} onChange={(v) => setFeature('offersSection', v)} />
        <Toggle label="Weight-based products (grocery)" checked={cfg.features.weightBasedProducts} onChange={(v) => setFeature('weightBasedProducts', v)} />
        <Toggle label="Add-ons / extras (food)" checked={cfg.features.addons} onChange={(v) => setFeature('addons', v)} />
        <Toggle label="Pre-order (bakery)" checked={cfg.features.preOrder} onChange={(v) => setFeature('preOrder', v)} />
        <Toggle label="Collections (fashion)" checked={cfg.features.collections} onChange={(v) => setFeature('collections', v)} />
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-800">Banners</h2>
          <Button variant="outline" onClick={addBanner}>+ Add banner</Button>
        </div>
        {cfg.banners.length === 0 && <p className="text-sm text-slate-400">No banners yet. Add one to show a hero image on your storefront.</p>}
        {cfg.banners.map((b) => (
          <div key={b.id} className="space-y-3 rounded-lg border border-slate-200 p-3">
            <ImageUploader label="Banner image" recommended="1200×450" value={b.imageUrl ? [b.imageUrl] : []} onChange={(urls) => updateBanner(b.id, { imageUrl: urls[0] ?? '' })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label="Title" value={b.title ?? ''} onChange={(e) => updateBanner(b.id, { title: e.target.value })} />
              <Input label="Subtitle" value={b.subtitle ?? ''} onChange={(e) => updateBanner(b.id, { subtitle: e.target.value })} />
              <Input label="Button label" value={b.ctaLabel ?? ''} onChange={(e) => updateBanner(b.id, { ctaLabel: e.target.value })} />
              <Input label="Button link (e.g. /category/offers)" value={b.ctaHref ?? ''} onChange={(e) => updateBanner(b.id, { ctaHref: e.target.value })} />
            </div>
            <button type="button" onClick={() => removeBanner(b.id)} className="text-sm text-red-500">Remove banner</button>
          </div>
        ))}
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save theme'}</Button>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
      </div>
    </div>
  );
}
