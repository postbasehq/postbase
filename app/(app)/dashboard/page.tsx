const pill =
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold font-display";

const QUEUE = [
  ["09:00", "X", "Launch thread", "Scheduled", "bg-blue-soft text-blue-ink", "bg-blue"],
  ["13:15", "LinkedIn", "Hiring post", "Publishing", "bg-amber-bright/15 text-amber", "bg-amber-bright"],
  ["18:30", "Instagram", "Product reel", "Published", "bg-green/15 text-green", "bg-green"],
  ["21:00", "X", "Token expired — reconnect", "Failed", "bg-terra/12 text-terra", "bg-terra"],
];

const CHANNELS = [
  ["X", "@postbasehq", "Connected", "bg-green"],
  ["LinkedIn", "Berkway Group", "Connected", "bg-green"],
  ["Instagram", "Not connected", "Connect", "bg-line"],
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[960px]">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Your upcoming posts and channel health.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* queue */}
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="font-display text-sm font-semibold">Upcoming</h2>
            <span className="ml-auto text-xs text-muted">Today</span>
          </div>
          {QUEUE.map(([time, ch, note, status, pillCls, dotCls], i) => (
            <div
              key={time}
              className={`grid grid-cols-[auto_1fr_auto] items-center gap-3.5 px-4 py-3.5 ${
                i < QUEUE.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <span className="font-display text-sm font-semibold tabular-nums">{time}</span>
              <span className="text-sm">
                <b className="font-semibold">{ch}</b>{" "}
                <span className="text-muted">· {note}</span>
              </span>
              <span className={`${pill} ${pillCls}`}>
                <span className={`size-2 rounded-full ${dotCls}`} />
                {status}
              </span>
            </div>
          ))}
        </section>

        {/* channels */}
        <section className="h-fit overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-sm font-semibold">Channels</h2>
          </div>
          {CHANNELS.map(([name, handle, action, dot], i) => (
            <div
              key={name}
              className={`flex items-center gap-3 px-4 py-3.5 ${
                i < CHANNELS.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <span className={`size-2.5 rounded-full ${dot}`} />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{name}</div>
                <div className="truncate text-xs text-muted">{handle}</div>
              </div>
              <span className="ml-auto text-xs font-medium text-muted">{action}</span>
            </div>
          ))}
        </section>
      </div>

      <p className="mt-6 text-xs text-muted">
        Sample data — the composer, calendar, and channel connections are the next build
        steps (Phase 1).
      </p>
    </div>
  );
}
