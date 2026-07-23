import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Host-based routing:
 *   • admin.<base>            → super-admin app (rewrite "/" → "/system") and the
 *                               store-owner dashboard (/admin/*).
 *   • <slug>.<base> / custom  → storefront ONLY.
 *
 * The store-owner admin (/admin/*) and super-admin (/system/*) are served
 * exclusively on the admin host. On any storefront host those paths redirect to
 * the admin host, so customer-facing shop subdomains never expose an admin/login
 * screen (and an admin session can't surface on a shop's public URL).
 *
 * The resolved host is forwarded downstream via `x-store-host` so server
 * components can ask the API to resolve the tenant.
 */
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'utanshop.com';
const SUPERADMIN_HOST = process.env.SUPERADMIN_HOST ?? `admin.${BASE_DOMAIN}`;

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0];
  const path = url.pathname;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-store-host', host);

  const isAdminArea =
    path === '/admin' || path.startsWith('/admin/') || path === '/system' || path.startsWith('/system/');

  // Admin + super-admin live only on the admin host. Redirect those paths off
  // any storefront host so shop subdomains stay storefront-only.
  if (isAdminArea && host && host !== SUPERADMIN_HOST) {
    return NextResponse.redirect(new URL(`${path}${url.search}`, `https://${SUPERADMIN_HOST}`), 307);
  }

  // Super-admin host: serve the /system app at the root.
  if (host === SUPERADMIN_HOST && (path === '/' || path === '')) {
    const rewrite = url.clone();
    rewrite.pathname = '/system';
    return NextResponse.rewrite(rewrite, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};
