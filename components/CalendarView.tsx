"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandTile } from "@/components/BrandTile";
import { CalendarChannelsBar } from "@/components/CalendarChannelsBar";

export type CalPost = {
  id: string;
  body: string;
  status: string;
  platforms: string[]; // channels this post targets
  dayKey: string; // YYYY-MM-DD (local)
  hour: number; // 0-23 local
  minute: number;
  timeLabel: string; // "09:00"
};

export type DayCol = {
  key: string; // YYYY-MM-DD
  dow: string; // "Mon"
  dayNum: number;
  monthShort: string;
  isToday: boolean;
};

export type MonthCell = { key: string | null; dayNum: number | null; isToday: boolean };

type View = "day" | "week" | "month" | "list";

const DOT: Record<string, string> = {
  draft: "bg-muted",
  scheduled: "bg-blue",
  publishing: "bg-amber-bright",
  published: "bg-green",
  failed: "bg-terra",
};

// Event-pill styling by status: a colored left accent + a subtle tinted fill.
const PILL: Record<string, string> = {
  draft: "border-line bg-surface-2 border-l-muted",
  scheduled: "border-line bg-blue-soft border-l-blue",
  publishing: "border-line bg-amber-bright/10 border-l-amber-bright",
  published: "border-line bg-green/10 border-l-green",
  failed: "border-line bg-terra/10 border-l-terra",
};
const pillClass = (status: string) => PILL[status] ?? PILL.draft;

// Overlapping channel brand icons for a post (falls back to a status dot).
function PlatformIcons({ platforms, status }: { platforms: string[]; status: string }) {
  if (!platforms.length) {
    return <span className={`size-1.5 shrink-0 rounded-full ${DOT[status] ?? "bg-muted"}`} />;
  }
  return (
    <span className="flex shrink-0 -space-x-1">
      {platforms.slice(0, 3).map((p) => (
        <span key={p} className="rounded-[4px] ring-1 ring-surface">
          <BrandTile platform={p} size={13} radius={4} />
        </span>
      ))}
      {platforms.length > 3 ? (
        <span className="pl-1 text-[10px] text-muted">+{platforms.length - 3}</span>
      ) : null}
    </span>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW = 68; // px per hour row

const pad = (n: number) => String(n).padStart(2, "0");

// Diagonal hatch marking past (unschedulable) slots — subtle in both themes.
const HATCH: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(130,130,130,0.14) 5px, rgba(130,130,130,0.14) 6px)",
};

// Pure calendar-date math on YYYY-MM-DD keys (UTC noon avoids DST drift).
function shiftKey(key: string, view: View, dir: 1 | -1): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  if (view === "month" || view === "list") dt.setUTCMonth(dt.getUTCMonth() + dir);
  else dt.setUTCDate(dt.getUTCDate() + dir * (view === "week" ? 7 : 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function CalendarView({
  view,
  anchor,
  todayKey,
  nowHour,
  title,
  days,
  monthCells,
  posts,
  accountsByPlatform,
  disconnectAction,
}: {
  view: View;
  anchor: string;
  todayKey: string;
  nowHour: number;
  title: string;
  days: DayCol[];
  monthCells: MonthCell[];
  posts: CalPost[];
  accountsByPlatform: Record<string, { id: string; handle: string | null; status: string }[]>;
  disconnectAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const go = (v: View, date: string) => router.push(`/calendar?view=${v}&date=${date}`);

  const byDayHour = new Map<string, CalPost[]>();
  const byDay = new Map<string, CalPost[]>();
  for (const p of posts) {
    (byDay.get(p.dayKey) ?? byDay.set(p.dayKey, []).get(p.dayKey)!).push(p);
    const k = `${p.dayKey}#${p.hour}`;
    (byDayHour.get(k) ?? byDayHour.set(k, []).get(k)!).push(p);
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      {/* header bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2/40 px-3.5 py-2.5 shadow-sm">
        {/* prev / next stepper */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => go(view, shiftKey(anchor, view, -1))}
            aria-label="Previous"
            className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Chevron dir="left" />
          </button>
          <button
            onClick={() => go(view, shiftKey(anchor, view, 1))}
            aria-label="Next"
            className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Chevron dir="right" />
          </button>
        </div>

        {/* period title */}
        <h2 className="font-display text-lg font-semibold tracking-[-0.01em] tabular-nums text-ink">
          {title}
        </h2>

        <button
          onClick={() => go(view, todayKey)}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          Today
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* granularity (calendar only) */}
          {view !== "list" ? (
            <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
              {(["day", "week", "month"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => go(v, anchor)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                    view === v ? "bg-blue text-on-blue shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : null}

          {/* calendar / list display toggle */}
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
            <button
              onClick={() => go(view === "list" ? "week" : view, anchor)}
              aria-label="Calendar view"
              className={`flex size-7 items-center justify-center rounded-full transition ${
                view !== "list" ? "bg-blue text-on-blue shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <CalendarIcon />
            </button>
            <button
              onClick={() => go("list", anchor)}
              aria-label="List view"
              className={`flex size-7 items-center justify-center rounded-full transition ${
                view === "list" ? "bg-blue text-on-blue shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="mt-3 flex-1 min-h-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {view === "list" ? (
          <ListView posts={posts} todayKey={todayKey} />
        ) : view === "month" ? (
          <MonthGrid cells={monthCells} byDay={byDay} todayKey={todayKey} />
        ) : (
          <TimeGrid days={days} byDayHour={byDayHour} todayKey={todayKey} nowHour={nowHour} />
        )}
      </div>

      <CalendarChannelsBar
        accountsByPlatform={accountsByPlatform}
        disconnectAction={disconnectAction}
      />
    </div>
  );
}

function TimeGrid({
  days,
  byDayHour,
  todayKey,
  nowHour,
}: {
  days: DayCol[];
  byDayHour: Map<string, CalPost[]>;
  todayKey: string;
  nowHour: number;
}) {
  const cols = `64px repeat(${days.length}, minmax(0, 1fr))`;
  // A slot is past only once it has fully elapsed: an earlier day, or today and
  // strictly before the current hour (the in-progress hour stays schedulable).
  const pastHours = (key: string) =>
    key < todayKey ? 24 : key === todayKey ? nowHour : 0;
  const isPast = (key: string, hour: number) => hour < pastHours(key);
  return (
    <div className="flex h-full flex-col">
      {/* day headers */}
      <div className="grid border-b border-line bg-surface-2/60" style={{ gridTemplateColumns: cols }}>
        <div className="border-r border-line" />
        {days.map((d) => (
          <div key={d.key} className="border-r border-line px-2 py-2.5 text-center last:border-r-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{d.dow}</div>
            <div
              className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full font-display text-sm font-semibold tabular-nums ${
                d.isToday ? "bg-blue text-on-blue" : ""
              }`}
            >
              {d.dayNum}
            </div>
          </div>
        ))}
      </div>

      {/* scrollable hour grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          {/* hour gutter */}
          <div className="border-r border-line">
            {HOURS.map((h) => (
              <div key={h} style={{ height: ROW }} className="relative">
                <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-muted">
                  {h === 0 ? "" : `${pad(h)}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* day columns */}
          {days.map((d) => {
            return (
              <div key={d.key} className="relative border-r border-line last:border-r-0">
                {HOURS.map((h) => {
                  const cell = byDayHour.get(`${d.key}#${h}`) ?? [];
                  const cellPast = isPast(d.key, h);
                  return (
                    <div
                      key={h}
                      className="group relative border-b border-line/60"
                      style={{ height: ROW, ...(cellPast ? HATCH : null) }}
                    >
                      {/* future: click-to-compose · past: "Date passed" on hover */}
                      {cellPast ? (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                          <span className="rounded-full bg-surface/80 px-2 py-0.5 text-[11px] font-medium text-muted">
                            Date passed
                          </span>
                        </div>
                      ) : (
                        <Link
                          href={`/composer?at=${d.key}T${pad(h)}:00`}
                          className="absolute inset-0 flex items-center justify-center text-muted opacity-0 transition group-hover:opacity-100 hover:bg-blue-soft/40"
                          aria-label={`New post ${d.key} ${pad(h)}:00`}
                        >
                          <span className="text-lg leading-none">+</span>
                        </Link>
                      )}
                      {/* events */}
                      <div className="pointer-events-none absolute inset-x-1 top-1 flex flex-col gap-1">
                        {cell.map((p) => (
                          <Link
                            key={p.id}
                            href={`/composer/${p.id}`}
                            className={`pointer-events-auto flex items-center gap-1.5 rounded-md border border-l-[3px] px-1.5 py-1 text-[11px] shadow-sm transition hover:shadow ${pillClass(p.status)}`}
                            title={`${p.timeLabel} · ${p.body || "(empty)"}`}
                          >
                            <PlatformIcons platforms={p.platforms} status={p.status} />
                            <span className="tabular-nums text-muted">{p.timeLabel}</span>
                            <span className="truncate">{p.body || "(empty)"}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MonthGrid({
  cells,
  byDay,
  todayKey,
}: {
  cells: MonthCell[];
  byDay: Map<string, CalPost[]>;
  todayKey: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-line bg-surface-2/60">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
            {d}
          </div>
        ))}
      </div>
      <div
        className="grid flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${Math.ceil(cells.length / 7)}, minmax(0, 1fr))` }}
      >
        {cells.map((c, i) => {
          const posts = c.key ? (byDay.get(c.key) ?? []) : [];
          const isPast = c.key ? c.key < todayKey : false;
          return (
            <div
              key={i}
              style={isPast ? HATCH : undefined}
              className={`min-h-[92px] border-b border-r border-line p-1.5 ${
                c.key ? "" : "bg-surface-2/50"
              }`}
            >
              {c.key ? (
                <>
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                        c.isToday ? "bg-blue text-on-blue" : "text-muted"
                      }`}
                    >
                      {c.dayNum}
                    </span>
                    {isPast ? null : (
                      <Link
                        href={`/composer?at=${c.key}T09:00`}
                        className="text-muted opacity-0 transition hover:text-blue-ink [.group:hover_&]:opacity-100"
                      >
                        +
                      </Link>
                    )}
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {posts.slice(0, 4).map((p) => (
                      <Link
                        key={p.id}
                        href={`/composer/${p.id}`}
                        className={`flex items-center gap-1.5 rounded border border-l-[3px] px-1.5 py-0.5 text-[11px] transition hover:shadow-sm ${pillClass(p.status)}`}
                        title={p.body}
                      >
                        <PlatformIcons platforms={p.platforms} status={p.status} />
                        <span className="tabular-nums text-muted">{p.timeLabel}</span>
                        <span className="truncate">{p.body || "(empty)"}</span>
                      </Link>
                    ))}
                    {posts.length > 4 ? (
                      <span className="pl-1 text-[10px] text-muted">+{posts.length - 4} more</span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft: { text: "Draft", cls: "text-muted" },
  scheduled: { text: "Scheduled", cls: "text-blue-ink" },
  publishing: { text: "Publishing", cls: "text-amber" },
  published: { text: "Published", cls: "text-green" },
  failed: { text: "Failed", cls: "text-terra" },
};

function dayHeader(key: string, todayKey: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const diff = Math.round((dt.getTime() - Date.UTC(ty, tm - 1, td)) / 86_400_000);
  const rel = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : null;
  const base = dt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return rel ? `${rel} · ${base}` : base;
}

// Chronological feed of posts grouped by day (server sends them time-ordered).
function ListView({ posts, todayKey }: { posts: CalPost[]; todayKey: string }) {
  const groups = new Map<string, CalPost[]>();
  for (const p of posts) (groups.get(p.dayKey) ?? groups.set(p.dayKey, []).get(p.dayKey)!).push(p);
  const days = Array.from(groups.keys()).sort();

  if (days.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted">Nothing scheduled.</p>
        <Link
          href="/composer"
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-blue-ink hover:bg-surface-2"
        >
          Write a post
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {days.map((dayKey) => (
        <div key={dayKey}>
          <div className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-2 font-display text-xs font-semibold uppercase tracking-wide text-muted backdrop-blur">
            {dayHeader(dayKey, todayKey)}
          </div>
          {groups.get(dayKey)!.map((p) => {
            const s = STATUS_LABEL[p.status] ?? { text: p.status, cls: "text-muted" };
            return (
              <Link
                key={p.id}
                href={`/composer/${p.id}`}
                className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-surface-2"
              >
                <span className="w-12 shrink-0 font-display text-sm font-semibold tabular-nums text-muted">
                  {p.timeLabel}
                </span>
                <PlatformIcons platforms={p.platforms} status={p.status} />
                <span className="min-w-0 flex-1 truncate text-sm">{p.body || "(no text)"}</span>
                <span className={`shrink-0 text-xs font-medium ${s.cls}`}>{s.text}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}
