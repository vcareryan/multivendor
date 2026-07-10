'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Select } from '@/components/admin/ui';

interface Template { id: string; name: string; industry: string; isPremium: boolean }
interface Theme { config: Record<string, unknown>; templateId?: string | null }

export default function ThemeSettingsPage() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [colors, setColors] = useState({ brand: '', accent: '' });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<Theme>('/admin/theme').then((t) => {
      setTheme(t);
      const c = (t.config?.colors ?? {}) as Record<string, string>;
      setColors({ brand: c.brand ?? '22 163 74', accent: c.accent ?? '234 88 12' });
    }).catch(() => undefined);
    api.get<Template[]>('/admin/theme/templates').then(setTemplates).catch(() => undefined);
  }, []);

  async function applyTemplate(id: string) {
    await api.post(`/admin/theme/apply/${id}`);
    const t = await api.get<Theme>('/admin/theme');
    setTheme(t);
    setMsg('Template applied');
  }

  async function saveColors() {
    if (!theme) return;
    const config = { ...theme.config, colors: { ...(theme.config.colors as object ?? {}), brand: colors.brand, accent: colors.accent } };
    await api.put('/admin/theme', config);
    setMsg('Theme saved');
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Theme" />
      <Card className="mb-4">
        <Select label="Apply an industry template" onChange={(e) => e.target.value && applyTemplate(e.target.value)} defaultValue="">
          <option value="">— choose a template —</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.isPremium ? ' (Premium)' : ''}</option>)}
        </Select>
      </Card>
      <Card className="space-y-4">
        <p className="text-sm text-slate-500">Colors use “R G B” format (e.g. <code>22 163 74</code>).</p>
        <Input label="Brand color" value={colors.brand} onChange={(e) => setColors({ ...colors, brand: e.target.value })} />
        <Input label="Accent color" value={colors.accent} onChange={(e) => setColors({ ...colors, accent: e.target.value })} />
        <div className="flex items-center gap-3"><Button onClick={saveColors}>Save theme</Button>{msg && <span className="text-sm text-emerald-600">{msg}</span>}</div>
      </Card>
    </div>
  );
}
