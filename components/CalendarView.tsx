"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { EmptyState } from "@/components/EmptyState";
import { useRouter } from "next/navigation";
import { reschedulePost, repostPost } from "@/app/(app)/actions";
import { Modal } from "@/components/Modal";
import { LogoMark } from "@/components/marketing/Decor";

// Layout effect on the client (avoids the SSR warning for a client component).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
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
  repeat?: boolean; // part of a repeating series
  media?: { url: string; type: string }; // first attachment, for the hover preview
  mediaCount?: number;
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

// Small marker shown on a pill that's part of a repeating series.
function RepeatGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-auto shrink-0 text-muted"
      aria-label="Repeating"
    >
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW = 68; // px per hour row
// Post pills that fit in one hour row (26px each + gap); more collapse into "+N more".
const MAX_IN_HOUR = 2;

const pad = (n: number) => String(n).padStart(2, "0");

// Diagonal hatch marking past (unschedulable) slots — subtle in both themes.
const HATCH: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(130,130,130,0.14) 5px, rgba(130,130,130,0.14) 6px)",
};

// --- drag to reschedule -------------------------------------------------------
// Scheduled posts move; published posts can be dragged to re-post a copy (after a
// confirm), leaving the original where it is. Mouse or pen only, and only onto a
// slot that's still in the future. Time grids snap to 15 minutes; the month grid
// keeps the post's time and changes the day.

const SNAP_MIN = 15;
/** Posts that can be picked up: scheduled ones move, published ones re-post. */
const canDrag = (status: string) => status === "scheduled" || status === "published";
const isRepost = (status: string) => status === "published";

const DRAG_THRESHOLD = 4; // px before a press becomes a drag (so clicks still open the post)
const EDGE = 48; // px from the grid's top/bottom edge that starts auto-scroll

type DropTarget = { dayKey: string; hour: number; minute: number; valid: boolean };

type DragInfo = {
  post: CalPost;
  width: number;
  grabX: number; // pointer offset inside the pill
  grabY: number;
};

/** Pill handlers + state handed down to the grids. */
type DragApi = {
  draggingId: string | null;
  target: DropTarget | null;
  onPillPointerDown: (e: React.PointerEvent<HTMLElement>, post: CalPost) => void;
  onPillClick: (e: React.MouseEvent<HTMLElement>) => void;
  onPillEnter: (e: React.MouseEvent<HTMLElement>, post: CalPost) => void;
  onPillLeave: () => void;
};

/** The viewer's local wall-clock "now" as a sortable "YYYY-MM-DD HH:MM" string. */
function nowStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const stamp = (dayKey: string, hour: number, minute: number) => `${dayKey} ${pad(hour)}:${pad(minute)}`;

function dropLabel(t: DropTarget): string {
  const [y, m, d] = t.dayKey.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${day} · ${pad(t.hour)}:${pad(t.minute)}`;
}

// --- hover preview ---------------------------------------------------------------

const HOVER_DELAY = 250; // ms before the preview appears
const CARD_W = 300;

// Solid Postbase colours for the status badge.
const BADGE: Record<string, { text: string; bg: string; fg: string }> = {
  draft: { text: "Draft", bg: "#6b7280", fg: "#fff" },
  scheduled: { text: "Scheduled", bg: "#2b59d9", fg: "#fff" },
  publishing: { text: "Publishing", bg: "#e3a72c", fg: "#14161a" },
  published: { text: "Published", bg: "#22a06b", fg: "#fff" },
  failed: { text: "Failed", bg: "#d14a3e", fg: "#fff" },
};

const PLATFORM_NAME: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

function longDate(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** A small floating card beside a hovered pill: text, when, where, media. */
function PostPreview({ post, anchor }: { post: CalPost; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Beside the pill (right, or left if there's no room), kept inside the window.
  useIsoLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    const gap = 10;
    const left =
      anchor.right + gap + CARD_W <= window.innerWidth - 8
        ? anchor.right + gap
        : Math.max(8, anchor.left - gap - CARD_W);
    const top = Math.min(Math.max(8, anchor.top - 6), window.innerHeight - h - 8);
    setPos({ left, top });
  }, [anchor, post.id]);

  const badge = BADGE[post.status] ?? BADGE.draft;
  const isVideo = post.media?.type.startsWith("video/");
  const extra = (post.mediaCount ?? 0) - 1;

  return (
    <div
      ref={ref}
      role="tooltip"
      className="pb-pop pointer-events-none fixed z-40 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_48px_-12px_rgba(16,24,40,0.35)]"
      style={{ width: CARD_W, left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
    >
      {post.media ? (
        <div className="relative aspect-video w-full overflow-hidden bg-[#14161a]">
          {isVideo ? (
            <>
              <video src={post.media.url} muted preload="metadata" className="size-full object-cover" />
              <span className="absolute inset-0 m-auto flex size-10 items-center justify-center rounded-full bg-white shadow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#14161a" aria-hidden>
                  <path d="M7 4v16l13-8z" />
                </svg>
              </span>
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media.url} alt="" className="size-full object-cover" />
          )}
          {extra > 0 ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-[#14161a] px-2 py-0.5 text-[11px] font-semibold text-white">
              +{extra}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: badge.bg, color: badge.fg }}
          >
            {badge.text}
          </span>
          <span className="text-[12px] font-semibold tabular-nums text-ink">
            {longDate(post.dayKey)} · {post.timeLabel}
          </span>
          {post.repeat ? (
            <span className="ml-auto flex items-center gap-1 text-[11px] text-muted">
              <RepeatGlyph />
              Repeats
            </span>
          ) : null}
        </div>

        <p className="line-clamp-6 whitespace-pre-line break-words text-[13px] leading-relaxed text-ink">
          {post.body || <span className="text-muted">No text</span>}
        </p>

        {post.platforms.length ? (
          <div className="flex flex-wrap gap-1.5">
            {post.platforms.map((p) => (
              <span
                key={p}
                className="flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-ink"
              >
                <BrandTile platform={p} size={16} radius={8} />
                {PLATFORM_NAME[p] ?? p}
              </span>
            ))}
          </div>
        ) : null}

        <div className="border-t border-line pt-2.5 text-[11px] text-muted">
          {post.status === "scheduled"
            ? "Click to edit · Drag to reschedule"
            : post.status === "published"
              ? "Click to open · Drag to re-post"
              : "Click to open"}
        </div>
      </div>
    </div>
  );
}

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
  /** Omitted for members: only owners and admins can disconnect. */
  disconnectAction?: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const go = (v: View, date: string) => router.push(`/calendar?view=${v}&date=${date}`);

  // Optimistic moves, shown until the server's refreshed posts arrive.
  const [moved, setMoved] = useState<Record<string, { dayKey: string; hour: number; minute: number }>>({});
  // Re-post copies shown straight away, until the server's copy arrives.
  const [copies, setCopies] = useState<CalPost[]>([]);
  useEffect(() => {
    setMoved({});
    setCopies([]);
  }, [posts]);
  const shown = useMemo(
    () => [
      ...posts.map((p) => {
        const m = moved[p.id];
        return m ? { ...p, ...m, timeLabel: `${pad(m.hour)}:${pad(m.minute)}` } : p;
      }),
      ...copies,
    ],
    [posts, moved, copies],
  );

  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  // A published post dropped on a new slot: ask before scheduling a copy.
  const [confirm, setConfirm] = useState<{ post: CalPost; target: DropTarget } | null>(null);
  const [, startTransition] = useTransition();
  const ghostRef = useRef<HTMLDivElement>(null);
  const pending = useRef<{ post: CalPost; x0: number; y0: number; info: DragInfo } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const targetRef = useRef<DropTarget | null>(null);
  const suppressClick = useRef(false);

  // Hover preview: appears after a short pause, never while dragging.
  const [hover, setHover] = useState<{ post: CalPost; rect: DOMRect } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPillEnter = useCallback((e: React.MouseEvent<HTMLElement>, post: CalPost) => {
    if (pending.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHover({ post, rect }), HOVER_DELAY);
  }, []);
  const onPillLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHover(null);
  }, []);
  useEffect(() => {
    // Scrolling the grid moves the pill away from the card, so hide it.
    const hide = () => onPillLeave();
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [onPillLeave]);

  useEffect(() => {
    if (!moveError) return;
    const t = setTimeout(() => setMoveError(null), 4000);
    return () => clearTimeout(t);
  }, [moveError]);

  // Which slot is under the pointer, and is it somewhere the post may go?
  const hitTest = useCallback((x: number, y: number, info: DragInfo): DropTarget | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-day]");
    if (!el) return null;
    const dayKey = el.dataset.dropDay!;
    let hour = info.post.hour;
    let minute = info.post.minute;
    if (el.dataset.dropKind === "time") {
      // Place by the pill's top edge, snapped to 15 minutes.
      const top = y - info.grabY - el.getBoundingClientRect().top;
      const mins = Math.round(((top / ROW) * 60) / SNAP_MIN) * SNAP_MIN;
      const clamped = Math.min(23 * 60 + 60 - SNAP_MIN, Math.max(0, mins));
      hour = Math.floor(clamped / 60);
      minute = clamped % 60;
    }
    const unchanged = dayKey === info.post.dayKey && hour === info.post.hour && minute === info.post.minute;
    const valid = !unchanged && stamp(dayKey, hour, minute) > nowStamp();
    return { dayKey, hour, minute, valid };
  }, []);

  const updateTarget = useCallback(
    (info: DragInfo) => {
      const t = hitTest(pointer.current.x, pointer.current.y, info);
      const prev = targetRef.current;
      if (
        prev?.dayKey !== t?.dayKey ||
        prev?.hour !== t?.hour ||
        prev?.minute !== t?.minute ||
        prev?.valid !== t?.valid
      ) {
        targetRef.current = t;
        setTarget(t);
      }
    },
    [hitTest],
  );

  const onPillPointerDown = useCallback((e: React.PointerEvent<HTMLElement>, post: CalPost) => {
    if (!canDrag(post.status) || e.button !== 0 || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    pending.current = {
      post,
      x0: e.clientX,
      y0: e.clientY,
      info: { post, width: r.width, grabX: e.clientX - r.left, grabY: e.clientY - r.top },
    };
  }, []);

  const onPillClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (suppressClick.current) {
      e.preventDefault();
      suppressClick.current = false;
    }
  }, []);

  // Window listeners for the whole press → drag → drop lifecycle.
  useEffect(() => {
    let raf = 0;
    const placeGhost = () => {
      const info = pending.current?.info;
      const g = ghostRef.current;
      if (!info || !g) return;
      g.style.transform = `translate3d(${pointer.current.x - info.grabX}px, ${pointer.current.y - info.grabY}px, 0)`;
    };
    // While dragging: auto-scroll the hour grid near its edges, then re-hit-test.
    const tick = () => {
      const p = pending.current;
      if (!p || !dragging) return;
      const sc = document.querySelector<HTMLElement>("[data-cal-scroll]");
      if (sc) {
        const r = sc.getBoundingClientRect();
        const y = pointer.current.y;
        const dy = y < r.top + EDGE ? -Math.ceil((r.top + EDGE - y) / 4) : y > r.bottom - EDGE ? Math.ceil((y - (r.bottom - EDGE)) / 4) : 0;
        if (dy) {
          sc.scrollTop += dy;
          updateTarget(p.info);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    let dragging = false;

    const end = (commit: boolean) => {
      cancelAnimationFrame(raf);
      const p = pending.current;
      const t = targetRef.current;
      pending.current = null;
      targetRef.current = null;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      if (!dragging || !p) return;
      dragging = false;
      suppressClick.current = true;
      setDrag(null);
      setTarget(null);
      if (!commit || !t?.valid) return;
      const { post } = p;
      if (isRepost(post.status)) {
        setConfirm({ post, target: t });
        return;
      }
      setMoved((m) => ({ ...m, [post.id]: { dayKey: t.dayKey, hour: t.hour, minute: t.minute } }));
      startTransition(async () => {
        const res = await reschedulePost(post.id, t.dayKey, t.hour, t.minute);
        if (!res.ok) {
          setMoved((m) => {
            const next = { ...m };
            delete next[post.id];
            return next;
          });
          setMoveError(res.error);
        }
        router.refresh();
      });
    };

    const onMove = (e: PointerEvent) => {
      const p = pending.current;
      if (!p) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      if (!dragging) {
        if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < DRAG_THRESHOLD) return;
        dragging = true;
        onPillLeave();
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        setDrag(p.info);
        raf = requestAnimationFrame(tick);
      }
      placeGhost();
      updateTarget(p.info);
    };
    const onUp = () => end(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [router, updateTarget, onPillLeave]);

  // Put the ghost under the pointer as soon as it mounts.
  useIsoLayoutEffect(() => {
    const info = drag;
    const g = ghostRef.current;
    if (info && g) {
      g.style.transform = `translate3d(${pointer.current.x - info.grabX}px, ${pointer.current.y - info.grabY}px, 0)`;
    }
  }, [drag]);

  const confirmRepost = () => {
    if (!confirm) return;
    const { post, target: t } = confirm;
    setConfirm(null);
    const temp: CalPost = {
      ...post,
      id: `copy-${post.id}-${Date.now()}`,
      status: "scheduled",
      dayKey: t.dayKey,
      hour: t.hour,
      minute: t.minute,
      timeLabel: `${pad(t.hour)}:${pad(t.minute)}`,
      repeat: false,
    };
    setCopies((c) => [...c, temp]);
    startTransition(async () => {
      const res = await repostPost(post.id, t.dayKey, t.hour, t.minute);
      if (!res.ok) {
        setCopies((c) => c.filter((x) => x.id !== temp.id));
        setMoveError(res.error);
      }
      router.refresh();
    });
  };

  const dragApi: DragApi = {
    draggingId: drag?.post.id ?? null,
    target,
    onPillPointerDown,
    onPillClick,
    onPillEnter,
    onPillLeave,
  };

  const byDayHour = new Map<string, CalPost[]>();
  const byDay = new Map<string, CalPost[]>();
  for (const p of shown) {
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
          <ListView posts={shown} todayKey={todayKey} />
        ) : view === "month" ? (
          <MonthGrid cells={monthCells} byDay={byDay} todayKey={todayKey} drag={dragApi} />
        ) : (
          <TimeGrid days={days} byDayHour={byDayHour} todayKey={todayKey} nowHour={nowHour} drag={dragApi} />
        )}
      </div>

      {/* the post following the pointer while it's dragged */}
      {drag ? (
        <div
          ref={ghostRef}
          className="pointer-events-none fixed left-0 top-0 z-50"
          style={{ width: drag.width, willChange: "transform" }}
          aria-hidden
        >
          <div
            className={`flex scale-[1.03] items-center gap-1.5 rounded-md border border-l-[3px] px-1.5 py-1 text-[11px] shadow-xl transition-opacity ${pillClass(
              drag.post.status,
            )} ${target?.valid ? "" : "opacity-70"}`}
          >
            <PlatformIcons platforms={drag.post.platforms} status={drag.post.status} />
            <span className="tabular-nums text-muted">
              {target?.valid ? `${pad(target.hour)}:${pad(target.minute)}` : drag.post.timeLabel}
            </span>
            <span className="truncate">{drag.post.body || "(empty)"}</span>
          </div>
          <div
            className={`mt-1.5 flex w-max items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-md ${
              target?.valid ? "bg-[#2b59d9] text-white" : "bg-surface text-muted ring-1 ring-line"
            }`}
          >
            {target?.valid ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {isRepost(drag.post.status) ? (
                  <>
                    <path d="m17 2 4 4-4 4" />
                    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                    <path d="m7 22-4-4 4-4" />
                    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                  </>
                ) : (
                  <path d="M5 12h14M13 6l6 6-6 6" />
                )}
              </svg>
            ) : null}
            {target?.valid
              ? `${isRepost(drag.post.status) ? "Re-post on" : "Move to"} ${dropLabel(target)}`
              : target
                ? "Pick a time in the future"
                : "Drop on the calendar"}
          </div>
        </div>
      ) : null}

      {hover && !drag ? <PostPreview post={hover.post} anchor={hover.rect} /> : null}

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        labelledBy="repost-title"
        panelClassName="relative isolate border border-line bg-surface shadow-[0_24px_64px_-16px_rgba(0,0,0,0.45)]"
      >
        {confirm ? (
          <>
            {/* the Postbase mark, faint, hanging from the top edge */}
            <LogoMark
              color="currentColor"
              edge="top"
              className="pointer-events-none absolute right-6 top-0 -z-10 w-[190px] -scale-x-100 text-ink opacity-[0.06]"
            />

            <div className="px-6 pb-5 pt-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#2b59d9] text-white shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m17 2 4 4-4 4" />
                  <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                  <path d="m7 22-4-4 4-4" />
                  <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                </svg>
              </span>
              <h3
                id="repost-title"
                className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-ink"
              >
                Do you want to re-post this?
              </h3>
              <p className="mt-1.5 text-balance text-sm leading-relaxed text-muted">
                This post has already gone out. We&apos;ll schedule a copy and leave the original where it is.
              </p>

              {/* from → to */}
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="rounded-xl border border-line px-3 py-2.5">
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">Went out</div>
                  <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-muted">
                    {longDate(confirm.post.dayKey)} · {confirm.post.timeLabel}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <div className="rounded-xl border-2 border-[#2b59d9] px-3 py-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#2b59d9]">Re-post</div>
                  <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink">
                    {longDate(confirm.target.dayKey)} · {pad(confirm.target.hour)}:{pad(confirm.target.minute)}
                  </div>
                </div>
              </div>

              {/* the post itself */}
              <div className="mt-3 rounded-xl bg-surface-2 p-3.5">
                <p className="line-clamp-4 whitespace-pre-line break-words text-[14px] leading-relaxed text-ink">
                  {confirm.post.body || <span className="text-muted">No text</span>}
                </p>
                {confirm.post.platforms.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {confirm.post.platforms.map((p) => (
                      <span
                        key={p}
                        className="flex items-center gap-1.5 rounded-full bg-surface py-0.5 pl-0.5 pr-2.5 text-[12px] font-medium text-ink"
                      >
                        <BrandTile platform={p} size={18} radius={9} />
                        {PLATFORM_NAME[p] ?? p}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {confirm.post.platforms.includes("x") ? (
                <p className="mt-3 text-balance text-[12px] leading-relaxed text-muted">
                  X may reject a post that&apos;s identical to a recent one. You can edit the copy after it&apos;s scheduled.
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-full border border-line px-5 py-2 font-display text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmRepost}
                className="rounded-full bg-[#2b59d9] px-5 py-2 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
              >
                Yes, re-post
              </button>
            </div>
          </>
        ) : null}
      </Modal>

      {moveError ? (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#d14a3e] px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          {moveError}
        </div>
      ) : null}

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
  drag,
}: {
  days: DayCol[];
  byDayHour: Map<string, CalPost[]>;
  todayKey: string;
  nowHour: number;
  drag: DragApi;
}) {
  const cols = `64px repeat(${days.length}, minmax(0, 1fr))`;

  // On load, scroll so the last scheduled post sits near the bottom of the grid
  // (rather than starting at the earliest hour). If there are no posts, stay put.
  // Only when the visible days change (first load, prev/next): not on every
  // render, so hovering or moving a post never yanks the scroll position.
  const scrollRef = useRef<HTMLDivElement>(null);
  let latest = -1;
  byDayHour.forEach((list) => {
    for (const p of list) latest = Math.max(latest, p.hour * 60 + p.minute);
  });
  useIsoLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (latest < 0) return;
    const top = (latest / 60) * ROW; // px offset of the latest post
    // Leave ~120px below the post so it reads as "near the bottom", not clipped.
    el.scrollTop = Math.max(0, top - (el.clientHeight - 120));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.map((d) => d.key).join()]);

  // A slot is past only once it has fully elapsed: an earlier day, or today and
  // strictly before the current hour (the in-progress hour stays schedulable).
  const pastHours = (key: string) =>
    key < todayKey ? 24 : key === todayKey ? nowHour : 0;
  const isPast = (key: string, hour: number) => hour < pastHours(key);

  // "+N more" opens a list of everything in that hour; outside click or Esc closes it.
  const [openCell, setOpenCell] = useState<string | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openCell) return;
    const onDown = (e: MouseEvent) => !popRef.current?.contains(e.target as Node) && setOpenCell(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenCell(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openCell]);

  const renderPill = (p: CalPost) => (
    <Link
                            key={p.id}
                            href={`/composer/${p.id}`}
                            draggable={false}
                            onPointerDown={(e) => drag.onPillPointerDown(e, p)}
                            onClick={drag.onPillClick}
                            onMouseEnter={(e) => drag.onPillEnter(e, p)}
                            onMouseLeave={drag.onPillLeave}
                            className={`pointer-events-auto flex items-center gap-1.5 rounded-md border border-l-[3px] px-1.5 py-1 text-[11px] shadow-sm transition hover:shadow ${pillClass(p.status)} ${
                              canDrag(p.status) ? "cursor-grab active:cursor-grabbing" : ""
                            } ${drag.draggingId === p.id && !isRepost(p.status) ? "opacity-40" : ""}`}
                            aria-label={`${p.timeLabel} · ${p.body || "(empty)"}`}
                          >
                            <PlatformIcons platforms={p.platforms} status={p.status} />
                            <span className="tabular-nums text-muted">{p.timeLabel}</span>
                            <span className="truncate">{p.body || "(empty)"}</span>
                            {p.repeat ? <RepeatGlyph /> : null}
                          </Link>
  );

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
      <div ref={scrollRef} data-cal-scroll className="flex-1 min-h-0 overflow-y-auto">
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
              <div
                key={d.key}
                data-drop-day={d.key}
                data-drop-kind="time"
                className="relative border-r border-line last:border-r-0"
              >
                {/* where a dragged post will land */}
                {drag.target?.valid && drag.target.dayKey === d.key ? (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-20 flex items-center rounded-md border-2 border-dashed border-[#2b59d9] bg-surface/70 px-1.5 text-[11px] font-semibold tabular-nums text-[#2b59d9] transition-[top] duration-100 ease-out"
                    style={{ top: ((drag.target.hour * 60 + drag.target.minute) / 60) * ROW + 1, height: 26 }}
                  >
                    {pad(drag.target.hour)}:{pad(drag.target.minute)}
                  </div>
                ) : null}
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
                      {/* events: two rows fit an hour; past that, the first one plus "+N more" */}
                      <div className="pointer-events-none absolute inset-x-1 top-1 flex flex-col gap-1">
                        {(cell.length > MAX_IN_HOUR ? cell.slice(0, MAX_IN_HOUR - 1) : cell).map((p) => renderPill(p))}
                        {cell.length > MAX_IN_HOUR ? (
                          <button
                            type="button"
                            onClick={() => setOpenCell(`${d.key}#${h}`)}
                            className="pointer-events-auto flex items-center justify-center rounded-md border border-line bg-surface px-1.5 py-1 text-[11px] font-semibold text-blue-ink shadow-sm transition hover:border-[#2b59d9]"
                          >
                            +{cell.length - (MAX_IN_HOUR - 1)} more
                          </button>
                        ) : null}
                      </div>
                      {/* everything in this hour, on top of the grid */}
                      {openCell === `${d.key}#${h}` ? (
                        <div
                          ref={popRef}
                          className="absolute inset-x-1 top-1 z-30 flex max-h-[320px] min-w-[220px] flex-col gap-1 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl"
                        >
                          <div className="flex items-center justify-between px-1 pb-1 pt-0.5 text-[11px] font-semibold text-muted">
                            <span>
                              {pad(h)}:00 · {cell.length} posts
                            </span>
                            <button type="button" onClick={() => setOpenCell(null)} aria-label="Close" className="rounded px-1 text-muted hover:text-ink">
                              ✕
                            </button>
                          </div>
                          {cell.map((p) => renderPill(p))}
                        </div>
                      ) : null}
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
  drag,
}: {
  cells: MonthCell[];
  byDay: Map<string, CalPost[]>;
  todayKey: string;
  drag: DragApi;
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
              data-drop-day={c.key ?? undefined}
              data-drop-kind="day"
              style={isPast ? HATCH : undefined}
              className={`min-h-[92px] border-b border-r border-line p-1.5 transition-shadow ${
                c.key ? "" : "bg-surface-2/50"
              } ${drag.target?.valid && drag.target.dayKey === c.key ? "shadow-[inset_0_0_0_2px_#2b59d9]" : ""}`}
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
                        draggable={false}
                        onPointerDown={(e) => drag.onPillPointerDown(e, p)}
                        onClick={drag.onPillClick}
                        onMouseEnter={(e) => drag.onPillEnter(e, p)}
                        onMouseLeave={drag.onPillLeave}
                        className={`flex items-center gap-1.5 rounded border border-l-[3px] px-1.5 py-0.5 text-[11px] transition hover:shadow-sm ${pillClass(p.status)} ${
                          canDrag(p.status) ? "cursor-grab active:cursor-grabbing" : ""
                        } ${drag.draggingId === p.id && !isRepost(p.status) ? "opacity-40" : ""}`}
                        aria-label={`${p.timeLabel} · ${p.body || "(empty)"}`}
                      >
                        <PlatformIcons platforms={p.platforms} status={p.status} />
                        <span className="tabular-nums text-muted">{p.timeLabel}</span>
                        <span className="truncate">{p.body || "(empty)"}</span>
                        {p.repeat ? <RepeatGlyph /> : null}
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
      <div className="flex h-full items-center justify-center">
        <EmptyState
          kind="calendar"
          title="Nothing scheduled in this range"
          body="Posts you schedule appear here in time order. Pick a time on the week view, or write one now."
          primary={{ href: "/composer", label: "Write a post" }}
        />
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
