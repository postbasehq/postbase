// Shown instantly on every in-app navigation while the target page's server
// component streams in. Without this, the router blocks on the full server
// render (auth + queries) before painting anything, which reads as "slow".
export default function Loading() {
  return (
    <div className="animate-pulse" aria-hidden>
      {/* header */}
      <div className="h-7 w-56 rounded-lg bg-surface-2" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-surface-2" />

      {/* content blocks */}
      <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-2xl border border-line bg-surface shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}
