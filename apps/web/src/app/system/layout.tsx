import { SystemShell } from '@/components/admin/SystemShell';

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return <SystemShell>{children}</SystemShell>;
}
