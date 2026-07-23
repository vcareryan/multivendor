/** Shown when a store exists for the host but isn't ACTIVE. */
export function StoreUnavailable({ status, name }: { status: string; name?: string | null }) {
  const store = name || 'This store';

  const content: Record<string, { title: string; message: string; icon: string }> = {
    SUSPENDED: {
      title: 'Store temporarily suspended',
      message: `${store} is currently suspended, usually due to a pending payment. Please contact the store owner to restore access. We apologise for the inconvenience.`,
      icon: '⏸️',
    },
    PENDING_SETUP: {
      title: 'Coming soon',
      message: `${store} isn't available yet — it's still being set up. Please check back shortly.`,
      icon: '🛠️',
    },
    DISABLED: {
      title: 'Store unavailable',
      message: `${store} is currently unavailable. Please contact the store owner for more information.`,
      icon: '🔒',
    },
  };

  const c = content[status] ?? {
    title: 'Store unavailable',
    message: `${store} is not available right now. Please try again later.`,
    icon: 'ℹ️',
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">{c.icon}</div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">{c.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{c.message}</p>
      </div>
    </div>
  );
}
