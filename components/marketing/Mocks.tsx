"use client";

import { BrandTile } from "@/components/BrandTile";

/*
 * Small product mocks for the homepage feature cards. Each one is a trimmed-down
 * piece of the real app's UI with example data — no stock photos.
 */

const frame = "rounded-xl border border-line bg-ground p-3.5";

/** The real /agent screen: suggestion prompts and the composer at work. */
export function AgentMock() {
  const ic = (d: React.ReactNode) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d}
    </svg>
  );
  return (
    <div className={`${frame} flex flex-col gap-3`}>
      <div className="grid grid-cols-2 gap-1.5">
        {["Draft a LinkedIn post announcing our new feature", "What do I have scheduled this week?"].map((s) => (
          <span key={s} className="rounded-xl border border-line bg-surface px-2.5 py-2 text-[11.5px] leading-snug text-muted">
            {s}
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-line bg-blue-soft px-3 py-1.5">
          <span className="text-blue-ink">
            {ic(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />)}
          </span>
          <span className="agent-shimmer text-[12px] font-medium">Drafting your post…</span>
        </div>
        <p className="px-3 pt-2.5 text-[12.5px] text-ink">
          Draft a LinkedIn post about our new roast for <span className="font-semibold text-blue-ink">@haldencoffee</span>
        </p>
        <div className="flex items-center gap-0.5 px-2 pb-2 pt-2 text-muted">
          <span className="flex size-7 items-center justify-center">
            {ic(<path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49" />)}
          </span>
          <span className="ml-0.5 flex items-center gap-0.5 rounded-full bg-surface-2 p-1 ring-1 ring-line/60">
            <span className="flex size-6 items-center justify-center">{ic(<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>)}</span>
            <span className="flex size-6 items-center justify-center">{ic(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>)}</span>
            <span className="flex size-6 items-center justify-center">{ic(<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />)}</span>
          </span>
          <span className="ml-auto rounded-full px-2 py-1 text-[11.5px] font-medium text-ink">Sonnet 5</span>
          <span className="flex size-8 items-center justify-center rounded-xl bg-blue text-on-blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="6" y="6" width="12" height="12" rx="2.5" />
            </svg>
          </span>
        </div>
      </div>
      <p className="text-center text-[10.5px] text-muted">Nothing publishes until you click Schedule.</p>
    </div>
  );
}

/** Media library: uploads with sizes and one in progress. */
export function MediaMock() {
  const files: [string, string, string][] = [
    ["kochere-launch.mp4", "Video", "48 MB"],
    ["brew-guide.jpg", "Image", "2.1 MB"],
    ["shop-banner.png", "Image", "860 KB"],
  ];
  return (
    <div className={frame}>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ink">Media</span>
        <span className="rounded-full bg-blue px-2.5 py-1 text-[11px] font-semibold text-on-blue">Upload</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {files.map(([name, kind, size]) => (
          <li key={name} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-surface-2 text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {kind === "Video" ? <path d="m22 8-6 4 6 4V8ZM2 6h14v12H2z" /> : <path d="M3 3h18v18H3zM3 15l5-5 4 4 3-3 6 6" />}
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{name}</span>
            <span className="text-[11px] tabular-nums text-muted">{size}</span>
          </li>
        ))}
        <li className="rounded-lg border border-dashed border-line px-2.5 py-2">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="font-medium text-ink">studio-tour.mov</span>
            <span className="tabular-nums text-muted">64%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-[64%] rounded-full bg-blue" />
          </div>
        </li>
      </ul>
    </div>
  );
}

/** Workspace switcher with roles. */
export function WorkspacesMock() {
  const rows: [string, string, string][] = [
    ["Halden Coffee", "3 channels", "Owner"],
    ["Crumb & Co.", "4 channels", "Editor"],
    ["Tom Reyes", "2 channels", "Editor"],
  ];
  return (
    <div className={frame}>
      <div className="mb-2 text-[12px] font-semibold text-ink">Workspaces</div>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([name, sub, role], i) => (
          <li
            key={name}
            className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${
              i === 0 ? "border-blue bg-surface" : "border-line bg-surface"
            }`}
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-ink font-display text-[12px] font-bold text-surface">
              {name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12px] font-semibold text-ink">{name}</div>
              <div className="text-[11px] text-muted">{sub}</div>
            </div>
            <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] font-medium text-muted">{role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Analytics: a few metric tiles with sparklines. */
export function AnalyticsMock() {
  const tiles: [string, string, string][] = [
    ["Impressions", "18.4k", "0,22 12,18 24,20 36,12 48,14 60,6 72,8"],
    ["Engagements", "1,236", "0,20 12,21 24,15 36,17 48,10 60,12 72,4"],
    ["Link clicks", "342", "0,18 12,16 24,19 36,14 48,15 60,9 72,10"],
  ];
  return (
    <div className={`${frame} grid grid-cols-3 gap-2`}>
      {tiles.map(([label, value, pts]) => (
        <div key={label} className="rounded-lg border border-line bg-surface p-2.5">
          <div className="text-[10.5px] text-muted">{label}</div>
          <div className="mt-0.5 font-display text-[17px] font-semibold tabular-nums text-ink">{value}</div>
          <svg viewBox="0 0 72 26" className="mt-1.5 h-6 w-full text-blue" preserveAspectRatio="none" aria-hidden>
            <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/** Delivery log: published, retrying, needs attention. */
export function DeliveryMock() {
  const rows: [string, string, string, string][] = [
    ["x", "Easy runs are too fast", "Published", "bg-green"],
    ["linkedin", "Fieldnote 2.4", "Published", "bg-green"],
    ["instagram", "Kochere, Ethiopia", "Retrying in 2 min", "bg-[#e3a72c]"],
    ["tiktok", "Pour-over in 60s", "Reconnect TikTok", "bg-[#d14a3e]"],
  ];
  return (
    <div className={frame}>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([p, title, status, dot]) => (
          <li key={title} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2">
            <BrandTile platform={p} size={20} radius={10} />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{title}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-muted">
              <span className={`size-1.5 rounded-full ${dot}`} />
              {status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
