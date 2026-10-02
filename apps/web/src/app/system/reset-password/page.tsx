'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { Button, Card, Input, PageHeader, Select } from '@/components/admin/ui';

interface Store {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface StoreListResponse {
  data: Store[];
  total: number;
}

/** Eye icon (open) */
function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Eye-off icon (closed) */
function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function ResetStorePasswordPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api
      .get<StoreListResponse>('/super/stores?pageSize=500')
      .then((res) => {
        setStores(res.data);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function handleReset() {
    setMsg(null);

    if (!selectedStoreId) {
      return setMsg({ ok: false, text: 'Please select a store' });
    }
    if (newPassword.length < 8) {
      return setMsg({ ok: false, text: 'New password must be at least 8 characters' });
    }
    if (newPassword !== confirmPassword) {
      return setMsg({ ok: false, text: 'Passwords do not match' });
    }

    setSaving(true);
    try {
      await api.put(`/super/stores/${selectedStoreId}/reset-password`, { newPassword });
      const store = stores.find((s) => s.id === selectedStoreId);
      setMsg({ ok: true, text: `Password reset successfully for "${store?.name ?? 'store'}". The owner will need to use the new password to log in.` });
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Failed to reset password' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading stores…</p>;

  return (
    <div className="max-w-xl space-y-4">
      <PageHeader title="Reset Store Password" />
      <p className="text-sm text-slate-500">
        Reset the password of any tenant store owner. The owner will be signed out of all devices immediately.
      </p>

      <Card className="space-y-4">
        <Select
          label="Select store"
          value={selectedStoreId}
          onChange={(e) => {
            setSelectedStoreId(e.target.value);
            setMsg(null);
          }}
        >
          <option value="">— Choose a store —</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name} ({store.slug}) — {store.status}
            </option>
          ))}
        </Select>

        {/* New password field with show/hide toggle */}
        <div className="relative">
          <Input
            label="New password (min 8 characters)"
            type={showNewPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
          >
            {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {/* Confirm password field with show/hide toggle */}
        <div className="relative">
          <Input
            label="Confirm new password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="danger"
            onClick={handleReset}
            disabled={saving || !selectedStoreId || !newPassword}
          >
            {saving ? 'Resetting…' : 'Reset Password'}
          </Button>
        </div>

        {msg && (
          <p className={`rounded p-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </p>
        )}
      </Card>
    </div>
  );
}
