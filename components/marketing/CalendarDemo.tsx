"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/marketing/AppShell";
import { BrandTile } from "@/components/BrandTile";
import { CERAMICS, COFFEE, FIELDNOTE, RUNNING, type Example } from "@/components/marketing/examples";

/*
 * A faithful copy of the app's week view (components/CalendarView.tsx): the
 * header bar, the hour grid with hatched past slots, single-line status pills
 * and the "Manage channels" bar — filled with example posts.
 */

const DAYS = [
  { dow: "Mon", d: 21 },
  { dow: "Tue", d: 22 },
  { dow: "Wed", d: 23, today: true },
  { dow: "Thu", d: 24 },
  { dow: "Fri", d: 25 },
  { dow: "Sat", d: 26 },
  { dow: "Sun", d: 27 },
];
const TODAY = 2;
const NOW_HOUR = 12;
const FIRST_HOUR = 9;
const HOURS = [9, 10, 11, 12, 13, 14, 15];
const ROW = 58;
const GUTTER = 64;
const pad = (n: number) => String(n).padStart(2, "0");

type Status = "published" | "scheduled" | "draft";
type Ev = {
  id: string;
  day: number;
  hour: number;
  minute: number;
  status: Status;
  chans: string[];
  post: Example;
  /** Scheduled by an agent over MCP (shown in the developers view). */
  agent?: boolean;
};

const EVENTS: Ev[] = [
  { id: "fieldnote", day: 0, hour: 9, minute: 0, status: "published", chans: ["x", "linkedin"], post: FIELDNOTE, agent: true },
  { id: "roasts", day: 0, hour: 12, minute: 30, status: "published", chans: ["x", "bluesky"], post: { ...COFFEE, body: "This week's roasts: Kochere, Huila decaf and our house espresso. All shipping Tuesday." } },
  { id: "easy", day: 1, hour: 10, minute: 30, status: "published", chans: ["x", "linkedin", "bluesky"], post: RUNNING },
  { id: "glaze", day: 1, hour: 14, minute: 0, status: "published", chans: ["bluesky", "mastodon"], post: CERAMICS },
  { id: "kochere", day: 2, hour: 12, minute: 0, status: "scheduled", chans: ["x", "linkedin", "bluesky"], post: COFFEE },
  { id: "cupping", day: 2, hour: 14, minute: 15, status: "scheduled", chans: ["linkedin"], post: { ...COFFEE, body: "Cupping notes from this morning: the Kochere keeps getting sweeter as it rests. Day 7 is the sweet spot." } },
  { id: "tempo", day: 3, hour: 10, minute: 0, status: "scheduled", chans: ["x", "linkedin"], post: { ...RUNNING, body: "Tempo runs, simply: 20 minutes at a pace you could hold for an hour. Comfortably hard, never all-out." } },
  { id: "brew", day: 3, hour: 11, minute: 15, status: "scheduled", chans: ["x", "linkedin"], post: { ...COFFEE, body: "How we brew the Kochere at home: V60, 15g coffee, 250g water at 94°C, 2:45 total.\n\nSwirl, don't stir." }, agent: true },
  { id: "hours", day: 4, hour: 12, minute: 0, status: "scheduled", chans: ["x", "bluesky", "mastodon"], post: { ...COFFEE, body: "Weekend hours: Saturday 8 to 2, Sunday 9 to 1. Fresh bags on the shelf both days." } },
  { id: "tour", day: 4, hour: 15, minute: 30, status: "draft", chans: ["linkedin"], post: { ...CERAMICS, body: "A quick tour of the studio: two wheels, one kiln and far too many test tiles." } },
  { id: "long", day: 5, hour: 9, minute: 15, status: "draft", chans: ["x"], post: { ...RUNNING, body: "18 miles this morning, all of it at conversation pace. Legs feel fine. Taper starts Monday." } },
  { id: "parkrun", day: 5, hour: 13, minute: 30, status: "scheduled", chans: ["x"], post: { ...RUNNING, body: "Parkrun this morning: 19:40, all even splits. Easy miles pay off." } },
  { id: "shop", day: 6, hour: 15, minute: 0, status: "scheduled", chans: ["bluesky", "x", "mastodon"], post: CERAMICS, agent: true },
];

/** The post that lands during the hero animation. */
const NEW_POST: Ev = {
  id: "launch",
  day: 4,
  hour: 14,
  minute: 0,
  status: "scheduled",
  chans: ["x", "linkedin", "bluesky"],
  post: { ...FIELDNOTE, body: "Launch week recap: offline mode, faster sync and 1,200 new teams. Thank you all." },
  agent: true,
};

// Same status styling as the app's calendar pills.
const PILL: Record<Status, string> = {
  draft: "border-line bg-surface-2 border-l-muted",
  scheduled: "border-line bg-blue-soft border-l-blue",
  published: "border-line bg-green/10 border-l-green",
};

// Diagonal hatch marking past slots, as in the app.
const HATCH: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(130,130,130,0.14) 5px, rgba(130,130,130,0.14) 6px)",
};
const isPast = (day: number, hour: number) => day < TODAY || (day === TODAY && hour < NOW_HOUR);

// Pill geometry on the absolute layer over the grid (lets a drag animate).
const colLeft = (day: number) => `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${day} / 7 + 4px)`;
const colWidth = `calc((100% - ${GUTTER}px) / 7 - 8px)`;
const PILL_H = 24;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Pointer = { day: number; hour: number; visible: boolean };

/**
 * `productShot` renders the full app (sidebar + week view) for the hero and
 * loops a short sequence: posts appear, one is dragged to another day, a new
 * post lands, and today's post goes out. Otherwise it's the still week view.
 */
export function CalendarDemo({
  showAgent = false,
  productShot = false,
  sidebar = productShot,
}: {
  showAgent?: boolean;
  productShot?: boolean;
  /** Show the app sidebar (defaults to on for the product shot). */
  sidebar?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [entered, setEntered] = useState(!productShot);
  const [moved, setMoved] = useState<Record<string, { day: number }>>({});
  const [added, setAdded] = useState<Ev | null>(null);
  const [statusOf, setStatusOf] = useState<Record<string, Status>>({});
  const [lifted, setLifted] = useState<string | null>(null);
  const [pointer, setPointer] = useState<Pointer>({ day: 2, hour: 15, visible: false });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!productShot || !rootRef.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(rootRef.current);
    return () => io.disconnect();
  }, [productShot]);

  useEffect(() => {
    if (!productShot) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }
    if (!inView) return;
    let cancelled = false;
    const step = async (ms: number) => {
      await sleep(ms);
      if (cancelled) throw new Error("stop");
    };
    (async () => {
      try {
        for (;;) {
          setMoved({});
          setAdded(null);
          setStatusOf({});
          setLifted(null);
          setToast(null);
          setPointer({ day: 2, hour: 15, visible: false });
          await step(150);
          setEntered(true);
          await step(1600);

          // Drag the cupping notes from Wednesday to Thursday.
          setPointer({ day: 2, hour: 14, visible: true });
          await step(900);
          setLifted("cupping");
          await step(350);
          setMoved({ cupping: { day: 3 } });
          setPointer({ day: 3, hour: 14, visible: true });
          await step(850);
          setLifted(null);
          await step(300);
          setPointer({ day: 3, hour: 14, visible: false });
          await step(600);

          // A new post lands on Friday.
          setAdded(NEW_POST);
          await step(1500);

          // Today's noon post goes out.
          setStatusOf({ kochere: "published" });
          setToast("Published to X, LinkedIn and Bluesky");
          await step(2800);
          setToast(null);
          await step(1800);

          setEntered(false);
          await step(700);
        }
      } catch {
        /* stopped */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productShot, inView]);

  const events = (added ? [...EVENTS, added] : EVENTS).map((e) => ({
    ...e,
    day: moved[e.id]?.day ?? e.day,
    status: statusOf[e.id] ?? e.status,
  }));
  // Stack posts that share an hour cell.
  const slot = new Map<string, number>();
  const stackIndex = (e: Ev) => {
    const k = `${e.day}#${e.hour}`;
    const n = slot.get(k) ?? 0;
    slot.set(k, n + 1);
    return n;
  };

  return (
    <AppShell active="/calendar" title="Calendar" sidebar={sidebar}>
      <div ref={rootRef} className="flex h-full">
        <div className="flex min-w-0 flex-1 flex-col px-5 pb-1 pt-1">
          {/* header bar */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2/40 px-3.5 py-2 shadow-sm">
            <div className="flex items-center gap-0.5 text-muted">
              <span className="flex size-7 items-center justify-center rounded-lg">
                <Chevron dir="left" />
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg">
                <Chevron dir="right" />
              </span>
            </div>
            <span className="font-display text-[16px] font-semibold tracking-[-0.01em] tabular-nums text-ink">21 – 27 Sep 2026</span>
            <span className="rounded-lg border border-line px-3 py-1 text-xs font-semibold text-ink">Today</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-1 rounded-full bg-surface-2 p-1 sm:flex">
                {["day", "week", "month"].map((v) => (
                  <span
                    key={v}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      v === "week" ? "bg-blue text-on-blue shadow-sm" : "text-muted"
                    }`}
                  >
                    {v}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
                <span className="flex size-6 items-center justify-center rounded-full bg-blue text-on-blue shadow-sm">
                  <CalendarIcon />
                </span>
                <span className="flex size-6 items-center justify-center rounded-full text-muted">
                  <ListIcon />
                </span>
              </div>
            </div>
          </div>

          {/* week grid */}
          <div className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="h-full overflow-x-auto">
              <div className="relative min-w-[640px]">
                {/* day headers */}
                <div className="grid border-b border-line bg-surface-2/60" style={{ gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0, 1fr))` }}>
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

                {/* hour grid + posts */}
                <div className="relative">
                  <div className="grid" style={{ gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0, 1fr))` }}>
                    <div className="border-r border-line">
                      {HOURS.map((h) => (
                        <div key={h} style={{ height: ROW }} className="relative">
                          <span className="absolute right-2 top-1 text-[11px] tabular-nums text-muted">{pad(h)}:00</span>
                        </div>
                      ))}
                    </div>
                    {DAYS.map((d, day) => (
                      <div key={d.dow} className="border-r border-line last:border-r-0">
                        {HOURS.map((h) => (
                          <div key={h} className="border-b border-line/60" style={{ height: ROW, ...(isPast(day, h) ? HATCH : null) }} />
                        ))}
                      </div>
                    ))}
                  </div>

                  {events.map((ev, i) => {
                    const stack = stackIndex(ev);
                    const isLifted = lifted === ev.id;
                    const isNew = ev.id === NEW_POST.id;
                    const delay = productShot && entered && !isNew && !isLifted && !moved[ev.id] ? i * 55 : 0;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        tabIndex={-1}
                                                title={ev.post.body}
                        className={`absolute flex items-center gap-1.5 rounded-md border border-l-[3px] px-1.5 text-left text-[11px] text-ink ${PILL[ev.status]} ${isLifted ? "z-20 shadow-[0_12px_26px_-8px_rgba(16,24,40,0.45)]" : "z-10 shadow-sm"} cursor-default`}
                        style={{
                          left: colLeft(ev.day),
                          width: colWidth,
                          top: (ev.hour - FIRST_HOUR) * ROW + 4 + stack * (PILL_H + 4),
                          height: PILL_H,
                          opacity: entered ? 1 : 0,
                          transform: entered ? (isLifted ? "scale(1.06) rotate(-1.5deg)" : "none") : "translateY(6px) scale(0.97)",
                          transition:
                            "left 750ms cubic-bezier(0.3,0.7,0.2,1), transform 300ms ease, opacity 400ms ease, box-shadow 300ms ease, background-color 500ms ease, border-color 500ms ease",
                          transitionDelay: delay ? `0ms, ${delay}ms, ${delay}ms, 0ms, 0ms, 0ms` : undefined,
                          animation: isNew ? "swap-in 450ms cubic-bezier(0.2,0.7,0.2,1) both" : undefined,
                        }}
                      >
                        <span className="flex shrink-0 -space-x-1">
                          {ev.chans.slice(0, 3).map((c) => (
                            <span key={c} className="rounded-[4px] ring-1 ring-surface">
                              <BrandTile platform={c} size={13} radius={4} />
                            </span>
                          ))}
                        </span>
                        <span className="tabular-nums text-muted">
                          {pad(ev.hour)}:{pad(ev.minute)}
                        </span>
                        <span className="truncate">{ev.post.body}</span>
                        {showAgent && ev.agent ? <span className="ml-auto shrink-0 font-mono text-[9px] text-muted">MCP</span> : null}
                      </button>
                    );
                  })}

                  {/* cursor */}
                  {productShot ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden
                      className="pointer-events-none absolute z-30 drop-shadow-md"
                      style={{
                        left: `calc(${colLeft(pointer.day)} + (100% - ${GUTTER}px) / 14)`,
                        top: (pointer.hour - FIRST_HOUR) * ROW + 12,
                        opacity: pointer.visible ? 1 : 0,
                        transition: "left 750ms cubic-bezier(0.3,0.7,0.2,1), top 750ms cubic-bezier(0.3,0.7,0.2,1), opacity 300ms ease",
                      }}
                    >
                      <path d="M4 2.5 19 11l-6.6 1.9L9 19.5z" fill="#202124" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </div>
              </div>
            </div>

            {toast ? (
              <div className="swap-in pointer-events-none absolute bottom-3 right-3 z-40 inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-[12px] font-medium text-surface shadow-lg">
                <span className="flex size-4 items-center justify-center rounded-full bg-green text-[10px] font-bold text-white">✓</span>
                {toast}
              </div>
            ) : null}
          </div>

          {/* manage channels bar */}
          <div className="flex h-14 shrink-0 items-center justify-between gap-4">
            <span className="font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">Manage channels</span>
            <div className="flex items-center pl-2">
              {["x", "linkedin", "instagram", "tiktok", "youtube", "bluesky", "mastodon"].map((p, i, all) => {
                const on = ["x", "linkedin", "bluesky", "mastodon"].includes(p);
                return (
                  <span
                    key={p}
                    style={{ marginLeft: i === 0 ? 0 : -3, transform: `rotate(${(i - (all.length - 1) / 2) * 6}deg)`, zIndex: i }}
                    className={`relative rounded-[8px] bg-surface p-[2px] shadow-sm ring-1 ring-line ${on ? "" : "opacity-45 grayscale"}`}
                  >
                    <BrandTile platform={p} size={22} radius={6} />
                  </span>
                );
              })}
              <span
                style={{ marginLeft: 6 }}
                className="relative flex size-[26px] items-center justify-center rounded-[8px] bg-surface text-blue-ink shadow-sm ring-1 ring-line"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}
