import type { ThemeConfig } from '@utanstore/shared';

/**
 * Injects the store's theme as CSS custom properties (server component — no JS
 * needed). Tailwind tokens (brand/accent/surface) map to these variables, so a
 * store's colors/fonts/radius are fully data-driven.
 */
export function ThemeStyle({ theme }: { theme: Partial<ThemeConfig> }) {
  const c = theme.colors;
  const f = theme.fonts;
  const vars: string[] = [];
  if (c?.brand) vars.push(`--color-brand:${c.brand}`);
  if (c?.brandFg) vars.push(`--color-brand-fg:${c.brandFg}`);
  if (c?.accent) vars.push(`--color-accent:${c.accent}`);
  if (c?.surface) vars.push(`--color-surface:${c.surface}`);
  if (c?.muted) vars.push(`--color-muted:${c.muted}`);
  if (f?.heading) vars.push(`--font-heading:'${f.heading}', ui-sans-serif, system-ui, sans-serif`);
  if (f?.body) vars.push(`--font-body:'${f.body}', ui-sans-serif, system-ui, sans-serif`);
  if (theme.radius) vars.push(`--radius-theme:${theme.radius}`);

  const css = `:root{${vars.join(';')}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
