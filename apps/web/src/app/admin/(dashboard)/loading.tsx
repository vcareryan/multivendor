/**
 * Admin route-level skeleton. Shows instantly during navigation between admin
 * pages while the target page loads its data — the sidebar/header stay put, so
 * switching sections feels immediate instead of flashing a blank "Loading…".
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-4 h-8 w-56 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-6 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
