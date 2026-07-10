import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Resolves the incoming hostname and routes:
 *   • admin.<base>            → super-admin app (rewrite "/" → "/system")
 *   • <slug>.<base> / custom  → storefront (default routes)
 *   • "/admin/*" on any host  → store owner dashboard
 *
 * The resolved host is forwarded downstream via the `x-store-host` header so
 * server components can ask the API to resolve the tenant.
 */
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'utanstore.com';
const SUPERADMIN_HOST = process.env.SUPERADMIN_HOST ?? `admin.${BASE_DOMAIN}`;

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0];

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-store-host', host);

  // Super-admin host: serve the /system app at the root.
  if (host === SUPERADMIN_HOST && (url.pathname === '/' || url.pathname === '')) {
    const rewrite = url.clone();
    rewrite.pathname = '/system';
    return NextResponse.rewrite(rewrite, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};
