"use client";

import { BrandTile } from "@/components/BrandTile";

/*
 * Small product mocks for the homepage feature cards. Each one is a trimmed-down
 * piece of the real app's UI with example data — no stock photos.
 */

const frame = "rounded-xl border border-line bg-ground p-3.5";

/** The in-app agent drafting a post. */
export function AgentMock() {
  return (
    <div className={`${frame} flex flex-col gap-2.5`}>
      <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-blue px-3 py-2 text-[12.5px] leading-snug text-on-blue">
        Write a LinkedIn post about our new Kochere roast. Friendly, no hashtags.
      </div>
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-surface px-3 py-2 text-[12.5px] leading-snug text-ink">
        Here&apos;s a draft. I&apos;ve set it for Wednesday at 12:00 PM — want me to schedule it?
        <div className="mt-2 rounded-lg border border-line bg-ground p-2 text-[12px] text-muted">
          New on the shelf: Kochere, Ethiopia. Apricot, black tea and a little bergamot…
        </div>
        <div className="mt-2 flex gap-1.5">
          <span className="rounded-full bg-blue px-2.5 py-1 text-[11px] font-semibold text-on-blue">Schedule</span>
          <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-ink">Edit</span>
        </div>
      </div>
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
