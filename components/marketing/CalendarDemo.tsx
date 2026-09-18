"use client";

import { AppShell } from "@/components/marketing/AppShell";
import { BrandTile } from "@/components/BrandTile";

const DAYS = [
  { dow: "Mon", d: 15 },
  { dow: "Tue", d: 16, today: true },
  { dow: "Wed", d: 17 },
  { dow: "Thu", d: 18 },
  { dow: "Fri", d: 19 },
  { dow: "Sat", d: 20 },
  { dow: "Sun", d: 21 },
];
const ROWS = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"];

const PILL: Record<string, string> = {
  scheduled: "bg-blue-soft border-line border-l-blue text-blue-ink",
  published: "bg-green/10 border-line border-l-green text-ink",
  draft: "bg-surface-2 border-line border-l-muted text-muted",
};

type Ev = { day: number; row: number; time: string; status: string; chans: string[]; label: string };
const EVENTS: Ev[] = [
  { day: 1, row: 0, time: "9:00", status: "scheduled", chans: ["x", "linkedin"], label: "Launch thread" },
  { day: 0, row: 2, time: "12:30", status: "published", chans: ["instagram"], label: "Behind the build" },
  { day: 2, row: 3, time: "2:15", status: "scheduled", chans: ["tiktok", "instagram"], label: "Product reel" },
  { day: 4, row: 1, time: "11:00", status: "scheduled", chans: ["linkedin"], label: "Weekly notes" },
  { day: 4, row: 5, time: "6:00", status: "draft", chans: ["x"], label: "Hot take (draft)" },
  { day: 6, row: 2, time: "12:00", status: "scheduled", chans: ["x", "youtube"], label: "Recap" },
];

export function CalendarDemo() {
  return (
    <AppShell active="/calendar" title="Calendar">
      <div className="flex h-full flex-col p-4">
        {/* toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2/40 px-3.5 py-2.5 shadow-sm">
          <span className="flex size-8 items-center justify-center rounded-lg text-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </span>
          <span className="font-display text-[15px] font-semibold text-ink">September 2026</span>
          <span className="flex size-8 items-center justify-center rounded-lg text-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </span>
          <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink">Today</span>
          <div className="ml-auto flex items-center gap-1 rounded-full bg-surface-2 p-1">
            {["Month", "Week", "List"].map((v) => (
              <span
                key={v}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  v === "Week" ? "bg-blue text-on-blue shadow-sm" : "text-muted"
                }`}
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* week grid */}
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          {/* day header */}
          <div className="grid border-b border-line bg-surface-2/60" style={{ gridTemplateColumns: "56px repeat(7,1fr)" }}>
            <div className="border-r border-line" />
            {DAYS.map((d) => (
              <div key={d.dow} className="border-r border-line px-2 py-2 text-center last:border-r-0">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{d.dow}</div>
                <div
                  className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full font-display text-sm font-semibold tabular-nums ${
                    d.today ? "bg-blue text-on-blue" : "text-ink"
                  }`}
                >
                  {d.d}
                </div>
              </div>
            ))}
          </div>

          {/* time rows */}
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7,1fr)" }}>
            {ROWS.map((label, r) => (
              <FragmentRow key={label} label={label} row={r} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FragmentRow({ label, row }: { label: string; row: number }) {
  return (
    <>
      <div className="flex items-start justify-end border-b border-r border-line px-2 pt-1 text-[11px] tabular-nums text-muted">
        {label}
      </div>
      {DAYS.map((_, day) => {
        const ev = EVENTS.find((e) => e.day === day && e.row === row);
        return (
          <div key={day} className="min-h-[54px] border-b border-r border-line p-1 last:border-r-0">
            {ev ? (
              <div
                className={`flex flex-col gap-1 rounded-md border border-l-[3px] px-1.5 py-1 text-[11px] shadow-sm ${PILL[ev.status]}`}
              >
                <div className="flex items-center gap-1">
                  <span className="flex -space-x-1">
                    {ev.chans.map((c) => (
                      <span key={c} className="rounded-[4px] ring-1 ring-surface">
                        <BrandTile platform={c} size={14} radius={4} />
                      </span>
                    ))}
                  </span>
                  <span className="ml-auto tabular-nums opacity-70">{ev.time}</span>
                </div>
                <span className="truncate font-medium">{ev.label}</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
