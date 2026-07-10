import Link from 'next/link';

/** Shown on the platform apex (utanstore.com) or unresolved hosts. */
export function PlatformLanding() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-heading text-4xl font-bold text-slate-900">UtanStore</h1>
      <p className="mt-4 text-lg text-slate-600">
        Launch your online store in minutes — grocery, textile, restaurant, bakery and more. Customers order over
        WhatsApp or pay online.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/admin/register" className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white">
          Create your store
        </Link>
        <Link href="/admin/login" className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium">
          Store login
        </Link>
      </div>
    </div>
  );
}
