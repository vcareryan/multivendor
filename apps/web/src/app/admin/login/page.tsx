'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ requires2fa?: boolean; role?: string }>('/auth/login', { email, password, totp: totp || undefined });
      if (res.requires2fa) {
        setNeeds2fa(true);
        setLoading(false);
        return;
      }
      router.push(res.role === 'SUPER_ADMIN' ? '/system' : '/admin/dashboard');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Store login</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        {needs2fa && (
          <input placeholder="2FA code" value={totp} onChange={(e) => setTotp(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        )}
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-slate-500">
          No store yet? <Link href="/admin/register" className="text-emerald-600">Create one</Link>
        </p>
      </form>
    </div>
  );
}
