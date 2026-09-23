"use client";

import { useEffect, useRef, useState } from "react";
import { BrandTile } from "@/components/BrandTile";

/*
 * Small product mocks for the homepage feature cards. Each is a trimmed-down
 * piece of the real app's UI with example data, and plays a short loop while
 * it's on screen (static when the visitor prefers reduced motion).
 */

const frame = "rounded-xl border border-line bg-ground p-3.5";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Step = (ms: number) => Promise<void>;

/**
 * Runs `script` in a loop while the element is on screen. Returns the ref to
 * attach and whether motion is allowed (false → render the settled state).
 */
export function useLoop<T extends HTMLElement>(script: (step: Step) => Promise<void>) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [motion, setMotion] = useState(true);
  const run = useRef(script);
  run.current = script;

  useEffect(() => {
    setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !motion) return;
    let cancelled = false;
    const step: Step = async (ms) => {
      await sleep(ms);
      if (cancelled) throw new Error("stop");
    };
    (async () => {
      try {
        for (;;) await run.current(step);
      } catch {
        /* stopped */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inView, motion]);

  return [ref, motion] as const;
}

const Spinner = () => (
  <span className="inline-block size-3 animate-spin rounded-full border-2 border-line border-t-[#e3a72c]" aria-hidden />
);

// ── AI agent ─────────────────────────────────────────────────────────────

const PROMPT = "Draft a LinkedIn post about our new roast for ";
const AGENT_STATES = ["", "Reading your channels…", "Drafting your post…", "done"] as const;

/** The real /agent screen: suggestion prompts and the composer at work. */
export function AgentMock() {
  const [typed, setTyped] = useState(PROMPT.length);
  const [phase, setPhase] = useState<(typeof AGENT_STATES)[number]>("done");
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setPhase("");
    setTyped(0);
    await step(600);
    for (let i = 1; i <= PROMPT.length; i++) {
      setTyped(i);
      await step(28);
    }
    await step(500);
    setPhase("Reading your channels…");
    await step(1300);
    setPhase("Drafting your post…");
    await step(1800);
    setPhase("done");
    await step(2600);
  });
  const busy = phase !== "" && phase !== "done";
  const ic = (d: React.ReactNode) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d}
    </svg>
  );
  return (
    <div ref={ref} className={`${frame} flex flex-col gap-3`}>
      <div className="grid grid-cols-2 gap-1.5">
        {["Draft a LinkedIn post announcing our new feature", "What do I have scheduled this week?"].map((s) => (
          <span key={s} className="rounded-xl border border-line bg-surface px-2.5 py-2 text-[11.5px] leading-snug text-muted">
            {s}
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div
          className={`grid transition-[grid-template-rows] duration-300 ${phase ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden">
            {phase === "done" ? (
              <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-1.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-green text-[9px] font-bold text-white">✓</span>
                <span className="text-[12px] font-medium text-ink">Draft ready — review it before scheduling</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-b border-line bg-blue-soft px-3 py-1.5">
                <span className="text-blue-ink">
                  {ic(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />)}
                </span>
                <span key={phase} className="agent-shimmer swap-in text-[12px] font-medium">
                  {phase || " "}
                </span>
              </div>
            )}
          </div>
        </div>
        <p className="min-h-[38px] px-3 pt-2.5 text-[12.5px] text-ink">
          {typed === 0 ? (
            <span className="text-muted">Ask the agent to draft or schedule a post…</span>
          ) : (
            <>
              {PROMPT.slice(0, typed)}
              {typed === PROMPT.length ? <span className="font-semibold text-blue-ink">@haldencoffee</span> : null}
            </>
          )}
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
            {busy ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="6" width="12" height="12" rx="2.5" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}
          </span>
        </div>
      </div>
      <p className="text-center text-[10.5px] text-muted">Nothing publishes until you click Schedule.</p>
    </div>
  );
}

// ── Media ────────────────────────────────────────────────────────────────

type MediaFile = { name: string; kind: "Video" | "Image"; size: string };
const START_FILES: MediaFile[] = [
  { name: "kochere-launch.mp4", kind: "Video", size: "48 MB" },
  { name: "brew-guide.jpg", kind: "Image", size: "2.1 MB" },
  { name: "shop-banner.png", kind: "Image", size: "860 KB" },
];
const UPLOADED: MediaFile = { name: "studio-tour.mov", kind: "Video", size: "212 MB" };

/** Media library: an upload fills up and joins the list. */
export function MediaMock() {
  const [files, setFiles] = useState<MediaFile[]>(START_FILES);
  const [progress, setProgress] = useState(64);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setFiles(START_FILES);
    setProgress(0);
    await step(500);
    for (let p = 4; p <= 100; p += 4) {
      setProgress(p);
      await step(70);
    }
    await step(300);
    setFiles([UPLOADED, ...START_FILES.slice(0, 2)]);
    setProgress(-1);
    await step(2600);
  });
  return (
    <div ref={ref} className={frame}>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ink">Media</span>
        <span className="rounded-full bg-blue px-2.5 py-1 text-[11px] font-semibold text-on-blue">Upload</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {files.map((f) => (
          <li
            key={f.name}
            className={`flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2 ${f === UPLOADED ? "swap-in" : ""}`}
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-surface-2 text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {f.kind === "Video" ? <path d="m22 8-6 4 6 4V8ZM2 6h14v12H2z" /> : <path d="M3 3h18v18H3zM3 15l5-5 4 4 3-3 6 6" />}
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{f.name}</span>
            <span className="text-[11px] tabular-nums text-muted">{f.size}</span>
          </li>
        ))}
        <li className="rounded-lg border border-dashed border-line px-2.5 py-2">
          {progress >= 0 ? (
            <>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="font-medium text-ink">{UPLOADED.name}</span>
                <span className="tabular-nums text-muted">{progress}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-blue transition-[width] duration-100" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <div className="py-[3px] text-center text-[11.5px] text-muted">Drop files to upload · up to 1 GB</div>
          )}
        </li>
      </ul>
    </div>
  );
}

// ── Teams ────────────────────────────────────────────────────────────────

const WORKSPACES: [string, string, string][] = [
  ["Halden Coffee", "3 channels", "Owner"],
  ["Crumb & Co.", "4 channels", "Editor"],
  ["Tom Reyes", "2 channels", "Editor"],
];

/** Workspace switcher: the active workspace moves down the list. */
export function WorkspacesMock() {
  const [active, setActive] = useState(0);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    for (let i = 0; i < WORKSPACES.length; i++) {
      setActive(i);
      await step(1700);
    }
  });
  return (
    <div ref={ref} className={frame}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ink">Workspaces</span>
        <span key={active} className="swap-in text-[11px] text-muted">
          Switched to <span className="font-medium text-ink">{WORKSPACES[active][0]}</span>
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {WORKSPACES.map(([name, sub, role], i) => (
          <li
            key={name}
            className={`flex items-center gap-2.5 rounded-lg border bg-surface px-2.5 py-2 transition-[border-color,box-shadow] duration-300 ${
              i === active ? "border-blue shadow-sm" : "border-line"
            }`}
          >
            <span
              className={`flex size-7 items-center justify-center rounded-md font-display text-[12px] font-bold transition-colors duration-300 ${
                i === active ? "bg-blue text-on-blue" : "bg-ink text-surface"
              }`}
            >
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

// ── Analytics ────────────────────────────────────────────────────────────

const TILES: { label: string; value: number; fmt: (n: number) => string; pts: string }[] = [
  { label: "Impressions", value: 18400, fmt: (n) => `${(n / 1000).toFixed(1)}k`, pts: "0,22 12,18 24,20 36,12 48,14 60,6 72,8" },
  { label: "Engagements", value: 1236, fmt: (n) => Math.round(n).toLocaleString("en-GB"), pts: "0,20 12,21 24,15 36,17 48,10 60,12 72,4" },
  { label: "Link clicks", value: 342, fmt: (n) => String(Math.round(n)), pts: "0,18 12,16 24,19 36,14 48,15 60,9 72,10" },
];

/** Analytics: metric tiles count up and their sparklines draw in. */
export function AnalyticsMock() {
  const [t, setT] = useState(1); // 0 → 1 progress of the count-up
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setT(0);
    await step(400);
    const frames = 36;
    for (let i = 1; i <= frames; i++) {
      setT(1 - Math.pow(1 - i / frames, 3));
      await step(33);
    }
    await step(4200);
  });
  return (
    <div ref={ref} className={`${frame} grid grid-cols-3 gap-2`}>
      {TILES.map((tile) => (
        <div key={tile.label} className="rounded-lg border border-line bg-surface p-2.5">
          <div className="text-[10.5px] text-muted">{tile.label}</div>
          <div className="mt-0.5 font-display text-[17px] font-semibold tabular-nums text-ink">{tile.fmt(tile.value * t)}</div>
          <svg viewBox="0 0 72 26" className="mt-1.5 h-6 w-full text-blue" preserveAspectRatio="none" aria-hidden>
            <polyline
              points={tile.pts}
              pathLength={1}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1"
              strokeDashoffset={1 - t}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

// ── Publishing ───────────────────────────────────────────────────────────

type Delivery = "scheduled" | "publishing" | "published" | "retry" | "retrying" | "reconnect";
const DELIVERY_LABEL: Record<Delivery, string> = {
  scheduled: "Scheduled · 12:00",
  publishing: "Publishing…",
  published: "Published",
  retry: "Retrying in 2 min",
  retrying: "Retrying…",
  reconnect: "Reconnect TikTok",
};
const DELIVERY_DOT: Partial<Record<Delivery, string>> = {
  scheduled: "bg-blue",
  published: "bg-green",
  retry: "bg-[#e3a72c]",
  reconnect: "bg-[#d14a3e]",
};
const ROWS: { p: string; title: string; start: Delivery }[] = [
  { p: "x", title: "Weekend shop hours", start: "scheduled" },
  { p: "linkedin", title: "Fieldnote 2.4", start: "published" },
  { p: "instagram", title: "Kochere, Ethiopia", start: "retry" },
  { p: "tiktok", title: "Pour-over in 60s", start: "reconnect" },
];

/** Delivery log: a post goes out, and a retry clears. */
export function DeliveryMock() {
  const [status, setStatus] = useState<Delivery[]>(ROWS.map((r) => r.start));
  const set = (i: number, s: Delivery) => setStatus((prev) => prev.map((v, j) => (j === i ? s : v)));
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setStatus(ROWS.map((r) => r.start));
    await step(1400);
    set(0, "publishing");
    await step(1500);
    set(0, "published");
    await step(1100);
    set(2, "retrying");
    await step(1500);
    set(2, "published");
    await step(2800);
  });
  return (
    <div ref={ref} className={frame}>
      <ul className="flex flex-col gap-1.5">
        {ROWS.map((r, i) => {
          const s = status[i];
          return (
            <li key={r.title} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2">
              <BrandTile platform={r.p} size={20} radius={10} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{r.title}</span>
              <span key={s} className="swap-in inline-flex shrink-0 items-center gap-1.5 text-[11px] text-muted">
                {s === "publishing" || s === "retrying" ? <Spinner /> : <span className={`size-1.5 rounded-full ${DELIVERY_DOT[s]}`} />}
                <span className={s === "published" ? "font-medium text-green" : ""}>{DELIVERY_LABEL[s]}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
