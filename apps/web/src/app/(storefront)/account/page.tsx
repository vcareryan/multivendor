'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useCustomer, type CustomerSession } from '@/lib/customer-store';

export default function AccountPage() {
  const router = useRouter();
  const { session, setSession, logout } = useCustomer();
  const [mounted, setMounted] = useState(false);
  const [redirect, setRedirect] = useState('/');

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const r = new URLSearchParams(window.location.search).get('redirect');
    if (r && r.startsWith('/')) setRedirect(r);
  }, []);

  async function sendCode() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await api.post('/customer-auth/login/send', { phone });
      setSent(true);
      setInfo('We sent you a verification code.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<CustomerSession>('/customer-auth/login/verify', { phone, code, name: name || undefined });
      setSession(res);
      router.push(redirect);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Avoid hydration mismatch: render nothing session-specific until mounted.
  if (!mounted) return <div className="mx-auto max-w-md py-12" />;

  if (session) {
    return (
      <div className="mx-auto max-w-md py-8">
        <h1 className="mb-4 font-heading text-2xl font-semibold">My account</h1>
        <div className="space-y-2 rounded-theme border border-black/5 bg-[rgb(var(--color-surface))] p-5">
          <p className="text-lg font-medium">{session.customer.name || 'Customer'}</p>
          <p className="text-sm text-[rgb(var(--color-muted))]">{session.customer.phone}</p>
          {session.customer.email && <p className="text-sm text-[rgb(var(--color-muted))]">{session.customer.email}</p>}
        </div>
        <div className="mt-4 flex gap-3">
          <Link href="/" className="rounded-theme bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg">Continue shopping</Link>
          <button onClick={() => logout()} className="rounded-theme border border-slate-300 px-5 py-2.5 text-sm font-medium">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="mb-1 font-heading text-2xl font-semibold">Sign in</h1>
      <p className="mb-5 text-sm text-[rgb(var(--color-muted))]">Verify your phone number to sign in or create an account.</p>

      <div className="space-y-4 rounded-theme border border-black/5 bg-[rgb(var(--color-surface))] p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Phone number</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={sent}
            placeholder="e.g. 9876543210"
            className="w-full rounded-theme border border-slate-300 px-3 py-2 outline-none focus:border-brand disabled:bg-black/5"
          />
        </label>

        {!sent && (
          <button
            onClick={sendCode}
            disabled={busy || phone.length < 8}
            className="w-full rounded-theme bg-brand px-5 py-2.5 font-medium text-brand-fg disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send code'}
          </button>
        )}

        {sent && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Your name (optional)</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-theme border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Verification code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                placeholder="6-digit code"
                className="w-full rounded-theme border border-slate-300 px-3 py-2 tracking-widest outline-none focus:border-brand"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={verify}
                disabled={busy || code.length < 4}
                className="flex-1 rounded-theme bg-brand px-5 py-2.5 font-medium text-brand-fg disabled:opacity-50"
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button onClick={sendCode} disabled={busy} className="rounded-theme border border-slate-300 px-4 py-2.5 text-sm">
                Resend
              </button>
            </div>
          </>
        )}

        {info && <p className="text-sm text-emerald-600">{info}</p>}
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
