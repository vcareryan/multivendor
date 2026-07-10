'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { INDUSTRY_LABELS } from '@utanstore/shared';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ storeName: '', industry: 'GROCERY', ownerName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      router.push('/admin/dashboard');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Create your store</h1>
        <input placeholder="Store name" value={form.storeName} onChange={set('storeName')} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        <select value={form.industry} onChange={set('industry')} className="w-full rounded-lg border border-slate-300 px-3 py-2">
          {Object.entries(INDUSTRY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input placeholder="Your name" value={form.ownerName} onChange={set('ownerName')} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        <input placeholder="WhatsApp phone (e.g. 919876543210)" value={form.phone} onChange={set('phone')} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        <input type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={set('password')} className="w-full rounded-lg border border-slate-300 px-3 py-2" required />
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white disabled:opacity-50">
          {loading ? 'Creating…' : 'Create store'}
        </button>
        <p className="text-center text-sm text-slate-500">
          Already have a store? <Link href="/admin/login" className="text-emerald-600">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
