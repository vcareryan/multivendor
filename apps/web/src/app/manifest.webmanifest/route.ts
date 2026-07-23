import { headers } from 'next/headers';
import type { StorefrontConfig } from '@utanstore/shared';

// Per-store PWA manifest: uses the store's own name, logo and theme color so an
// installed store app shows THAT store's logo/name (not a shared default).
export const dynamic = 'force-dynamic';

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function rgbToHex(triplet?: string): string | null {
  if (!triplet) return null;
  const p = triplet.trim().split(/\s+/).map(Number);
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return null;
  return '#' + p.map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
}

function iconType(url: string): string {
  const u = url.toLowerCase().split('?')[0];
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (u.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png';
}

const DEFAULT_ICONS = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export async function GET() {
  const h = headers();
  const storeHost = (h.get('x-store-host') || h.get('x-forwarded-host') || h.get('host') || '').split(':')[0];

  let name = 'Online Store';
  let themeColor = '#059669';
  let background = '#ffffff';
  let icons: Array<Record<string, string>> = DEFAULT_ICONS;

  try {
    const res = await fetch(`${INTERNAL_API_URL}/store/config?__tenant=${encodeURIComponent(storeHost)}`, {
      headers: { 'x-forwarded-host': storeHost },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: StorefrontConfig };
      const config = json.data;
      if (config?.store?.name) name = config.store.name;
      themeColor = rgbToHex(config?.theme?.colors?.brand) ?? themeColor;
      background = rgbToHex(config?.theme?.colors?.bg) ?? background;
      const logo = config?.store?.logoUrl;
      if (logo) {
        const t = iconType(logo);
        icons = [
          { src: logo, sizes: '192x192', type: t, purpose: 'any' },
          { src: logo, sizes: '512x512', type: t, purpose: 'any' },
          { src: logo, sizes: '512x512', type: t, purpose: 'maskable' },
        ];
      }
    }
  } catch {
    /* fall back to defaults */
  }

  const manifest = {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description: `${name} — order online`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: background,
    theme_color: themeColor,
    icons,
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
