"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/marketing/AppShell";
import { BrandTile } from "@/components/BrandTile";
import { COFFEE } from "@/components/marketing/examples";

/*
 * Product shot of the real composer's "Customize per channel" flow
 * (components/PostForm.tsx): channel tiles, the variant tabs, the caption
 * editor with each network's character limit, the toolbar and the schedule
 * bar. It loops: a cursor opens each channel's tab and types that network's cut.
 */

type Tab = "base" | "x" | "linkedin" | "bluesky";

const CHANNELS: { id: Exclude<Tab, "base">; limit: number }[] = [
  { id: "x", limit: 280 },
  { id: "linkedin", limit: 3000 },
  { id: "bluesky", limit: 300 },
];

const VARIANTS: Record<Exclude<Tab, "base">, string> = {
  x: "New on the shelf: Kochere, Ethiopia ☕️ Apricot, black tea and a little bergamot. 40 bags, roasted Monday.",
  linkedin:
    "We've added a new single origin: Kochere, from southern Ethiopia.\n\nIt's a washed, light roast with apricot, black tea and bergamot in the cup. We roast in small batches every Monday, so there are 40 bags this week.",
  bluesky: "Kochere, Ethiopia just landed ☕️ Washed, light roast, tastes like apricot and black tea. 40 bags this week.",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ComposerShot() {
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLSpanElement | null>>>({});
  const [inView, setInView] = useState(false);
  const [tab, setTab] = useState<Tab>("base");
  const [typed, setTyped] = useState<Partial<Record<Tab, string>>>({});
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean; down: boolean }>({
    x: 0,
    y: 0,
    visible: false,
    down: false,
  });

  useEffect(() => {
    if (!rootRef.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(rootRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped({ ...VARIANTS });
      setTab("x");
      return;
    }
    if (!inView) return;
    let cancelled = false;
    const step = async (ms: number) => {
      await sleep(ms);
      if (cancelled) throw new Error("stop");
    };
    // Point the cursor at a tab, relative to the shot's root.
    const aim = (t: Tab) => {
      const el = tabRefs.current[t];
      const root = rootRef.current;
      if (!el || !root) return;
      const a = el.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      // Rects are in screen px; the cursor moves in the shot's own px (it may be zoomed).
      const k = b.width / root.offsetWidth || 1;
      setCursor((c) => ({ ...c, x: (a.left - b.left + a.width * 0.55) / k, y: (a.top - b.top + a.height * 0.6) / k, visible: true }));
    };
    (async () => {
      try {
        for (;;) {
          setTab("base");
          setTyped({});
          setCursor((c) => ({ ...c, visible: false }));
          await step(1400);
          for (const { id } of CHANNELS) {
            aim(id);
            await step(750);
            setCursor((c) => ({ ...c, down: true }));
            await step(140);
            setCursor((c) => ({ ...c, down: false }));
            setTab(id);
            await step(350);
            const text = VARIANTS[id];
            for (let i = 1; i <= text.length; i += 2) {
              setTyped((t) => ({ ...t, [id]: text.slice(0, i) }));
              await step(16);
            }
            setTyped((t) => ({ ...t, [id]: text }));
            await step(1300);
          }
          aim("base");
          await step(750);
          setTab("base");
          setCursor((c) => ({ ...c, visible: false }));
          await step(2200);
        }
      } catch {
        /* stopped */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inView]);

  const channel = CHANNELS.find((c) => c.id === tab);
  const text = tab === "base" ? COFFEE.body : (typed[tab] ?? "");
  const len = text.length;

  return (
    <AppShell active="/composer" title="Composer" sidebar={false}>
      <div ref={rootRef} className="relative flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-hidden px-6 pt-2">
          {/* channels */}
          <p className="font-display text-[15px] font-semibold text-ink">Available channels</p>
          <div className="mt-3 flex items-center gap-3">
            {CHANNELS.map((c) => (
              <span key={c.id} className="rounded-full ring-2 ring-blue ring-offset-2 ring-offset-surface">
                <BrandTile platform={c.id} size={34} radius={17} />
              </span>
            ))}
            {["instagram", "tiktok"].map((p) => (
              <span key={p} className="rounded-full opacity-45">
                <BrandTile platform={p} size={34} radius={17} />
              </span>
            ))}
          </div>

          {/* customize per channel */}
          <p className="mt-6 px-1 font-display text-[15px] font-semibold text-ink">Customize per channel</p>
          <div className="mt-3 flex flex-wrap items-center gap-1 rounded-xl bg-surface-2/60 p-1">
            <span
              ref={(el) => {
                tabRefs.current.base = el;
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                tab === "base" ? "bg-surface text-ink shadow-sm" : "text-muted"
              }`}
            >
              All channels
            </span>
            {CHANNELS.map((c) => (
              <span
                key={c.id}
                ref={(el) => {
                  tabRefs.current[c.id] = el;
                }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  tab === c.id ? "bg-surface text-ink shadow-sm" : "text-muted"
                }`}
              >
                <BrandTile platform={c.id} size={15} radius={4} />
                @{COFFEE.handle}
                {typed[c.id] ? <span className="size-1.5 rounded-full bg-blue" /> : null}
              </span>
            ))}
          </div>

          {/* editor */}
          <div className="mt-4 rounded-xl border border-line bg-ground p-3.5">
            <p className="min-h-[120px] whitespace-pre-line text-[15px] leading-relaxed text-ink">
              {text}
              {tab !== "base" && len < VARIANTS[tab].length ? (
                <span className="ml-px inline-block h-[1.1em] w-px translate-y-[3px] animate-pulse bg-ink" />
              ) : null}
            </p>
            <div className="mt-1 flex items-center gap-3 text-xs">
              <span className="tabular-nums text-muted">
                {len.toLocaleString()}
                {channel ? ` / ${channel.limit.toLocaleString()}` : " characters"}
              </span>
              {channel ? <span className="font-medium text-blue-ink">Copy base text</span> : null}
              {channel && len ? <span className="ml-auto text-muted">Use base instead</span> : null}
            </div>
          </div>

          {/* toolbar */}
          <div className="mt-3 flex flex-wrap items-center gap-0.5 text-xs font-medium text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-4.5-4.5L5 21" />
              </svg>
              Media
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              Library
            </span>
            {tab === "base" ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add comment / post
              </span>
            ) : null}
          </div>
        </div>

        {/* action bar */}
        <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-6 py-3">
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-ground px-3 py-2 text-[13px] text-ink">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Wed 23 Sep, 12:00
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ground px-2.5 py-2 text-[13px] text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m17 2 4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="m7 22-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
            Don&apos;t repeat
          </span>
          <span className="ml-auto flex -space-x-1">
            {CHANNELS.map((c) => (
              <span key={c.id} className="rounded-[4px] ring-1 ring-surface">
                <BrandTile platform={c.id} size={16} radius={4} />
              </span>
            ))}
          </span>
          <span className="rounded-full bg-blue px-4 py-2 font-display text-[13px] font-semibold text-on-blue shadow-sm">Schedule</span>
        </div>

        {/* cursor */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-30 drop-shadow-md"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px) scale(${cursor.down ? 0.85 : 1})`,
            opacity: cursor.visible ? 1 : 0,
            transition: "transform 650ms cubic-bezier(0.3,0.7,0.2,1), opacity 300ms ease",
          }}
        >
          <path d="M4 2.5 19 11l-6.6 1.9L9 19.5z" fill="#202124" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
    </AppShell>
  );
}
