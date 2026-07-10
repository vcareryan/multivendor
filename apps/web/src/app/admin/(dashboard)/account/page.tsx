'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { Button, Card, Input, PageHeader } from '@/components/admin/ui';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: string | null;
}

export default function AccountPage() {
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    api.get<Profile>('/auth/profile').then(setP).catch(() => undefined);
  }, []);

  async function saveProfile() {
    if (!p) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await api.put('/auth/profile', { name: p.name, phone: p.phone });
      setProfileMsg('Profile saved');
    } catch (e) {
      setProfileMsg((e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setPwMsg(null);
    if (next.length < 8) {
      setPwMsg({ ok: false, text: 'New password must be at least 8 characters' });
      return;
    }
    if (next !== confirm) {
      setPwMsg({ ok: false, text: 'New password and confirmation do not match' });
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      setPwMsg({ ok: true, text: 'Password changed. Other devices have been signed out.' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not change password';
      setPwMsg({ ok: false, text: msg });
    } finally {
      setSavingPw(false);
    }
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    router.replace('/admin/login');
  }

  if (!p) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title="My account"
        action={
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        }
      />

      <Card className="space-y-4">
        <h2 className="font-medium text-slate-800">Profile</h2>
        <Input label="Name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        <Input label="Phone" value={p.phone ?? ''} onChange={(e) => setP({ ...p, phone: e.target.value })} />
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">{p.email}</p>
        </div>
        <p className="text-xs text-slate-400">
          Role: {p.role}
          {p.lastLoginAt ? ` · Last login: ${new Date(p.lastLoginAt).toLocaleString()}` : ''}
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save profile'}
          </Button>
          {profileMsg && <span className="text-sm text-emerald-600">{profileMsg}</span>}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-medium text-slate-800">Change password</h2>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Input
          label="New password (min 8 characters)"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button onClick={changePassword} disabled={savingPw || !current || !next}>
            {savingPw ? 'Updating…' : 'Update password'}
          </Button>
          {pwMsg && <span className={`text-sm ${pwMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{pwMsg.text}</span>}
        </div>
      </Card>
    </div>
  );
}
