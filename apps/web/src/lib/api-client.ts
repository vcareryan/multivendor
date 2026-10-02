'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

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

function doFetch(path: string, init: RequestInit): Promise<Response> {
  // Browser calls cross to api.<base> through the reverse proxy, which rewrites
  // X-Forwarded-Host and loses the storefront host. Send the real store host in
  // a custom header the proxy leaves intact so the API can resolve the tenant.
  // (Safe: authenticated routes bind the tenant from the JWT, overriding this;
  //  it only affects public storefront reads.)
  const storeHost = typeof window !== 'undefined' ? window.location.host : '';
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(storeHost ? { 'x-store-host': storeHost } : {}),
      ...(init.headers as Record<string, string>),
    },
  });
}

/**
 * Browser fetch. Sends credentials (httpOnly cookies) for admin routes; the
 * tenant is resolved server-side from the Host header for storefront routes.
 *
 * On a 401 (expired short-lived access token) it transparently calls
 * /auth/refresh (using the long-lived refresh cookie) and retries once, so
 * admin sessions don't break every 15 minutes.
 */
export async function apiClient<T>(path: string, init: RequestInit = {}, _retried = false): Promise<T> {
  let res = await doFetch(path, init);

  if (res.status === 401 && !_retried && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await doFetch('/auth/refresh', { method: 'POST' }).catch(() => null);
    if (refreshed && refreshed.ok) {
      res = await doFetch(path, init); // retry the original request once
    }
  }

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new ApiError(res.status, typeof json?.message === 'string' ? json.message : `Request failed (${res.status})`, json);
  }
  return json.data;
}

export const api = {
  get: <T>(path: string) => apiClient<T>(path),
  post: <T>(path: string, body?: unknown) => apiClient<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => apiClient<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => apiClient<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiClient<T>(path, { method: 'DELETE' }),
};

export { API_URL };
