import { headers, cookies } from 'next/headers';

// Server-side calls must hit the API DIRECTLY over the internal network, not
// through the public reverse proxy (Caddy). Caddy rewrites `X-Forwarded-Host`
// to the request's real Host (e.g. api.utanshop.com), which would clobber the
// tenant host we forward for storefront resolution and yield "Store not found".
const API_URL =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'utanstore.com';
/** Dev override: pretend requests come from this store host when on localhost. */
const DEV_STORE_HOST = process.env.NEXT_PUBLIC_DEV_STORE_HOST;

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: unknown;
  message?: unknown;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

function resolveStoreHost(): string | undefined {
  try {
    const h = headers();
    const host = h.get('x-store-host') || h.get('x-forwarded-host') || h.get('host') || '';
    const clean = host.split(':')[0];
    if (!clean || clean === 'localhost' || clean === '127.0.0.1') return DEV_STORE_HOST;
    return clean;
  } catch {
    return DEV_STORE_HOST;
  }
}

/** Server-side fetch that forwards the tenant host + auth cookie to the API. */
export async function apiServer<T>(path: string, init: RequestInit & { revalidate?: number } = {}): Promise<T> {
  const storeHost = resolveStoreHost();
  const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (storeHost) reqHeaders['x-forwarded-host'] = storeHost;

  try {
    const cookieHeader = cookies().toString();
    if (cookieHeader) reqHeaders['cookie'] = cookieHeader;
  } catch {
    /* not in a request scope */
  }

  const { revalidate, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: { ...reqHeaders, ...(init.headers as Record<string, string>) },
    ...(revalidate !== undefined ? { next: { revalidate } } : { cache: 'no-store' }),
  });

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new ApiError(res.status, typeof json?.message === 'string' ? json.message : `Request failed (${res.status})`, json);
  }
  return json.data;
}

export { API_URL, BASE_DOMAIN };
