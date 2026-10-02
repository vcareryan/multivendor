'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Card, PageHeader } from '@/components/admin/ui';

interface User { id: string; name: string; email: string; role: string; tenantId?: string | null; isActive: boolean }

export default function SystemUsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  useEffect(() => { api.get<{ data: User[] }>('/super/users?pageSize=100').then((r) => setRows(r.data)).catch(() => undefined); }, []);

  return (
    <div>
      <PageHeader title="Users" />
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Tenant</th><th>Active</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="py-2">{u.name}</td><td>{u.email}</td><td>{u.role}</td><td className="text-xs">{u.tenantId ?? '—'}</td><td>{u.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
