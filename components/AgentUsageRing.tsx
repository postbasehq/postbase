"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type AgentUsageInfo = {
  planName: string | null;
  images: { used: number; limit: number } | null;
  videos: { used: number; limit: number } | null;
  /** When the monthly AI allowances reset, e.g. "1 Oct". */
  resets: string;
  /** Workspaces sharing the plan's allowances (1 = just this one). */
  workspaces: number;
};

const BLUE = "#2b59d9";
const AMBER = "#e3a72c";
const RED = "#d14a3e";
const tone = (pct: number) => (pct >= 1 ? RED : pct >= 0.8 ? AMBER : BLUE);

/**
 * Plan usage for the agent chat: a ring beside the model picker that fills as
 * the month's AI image and video allowances are used, and opens a small panel
 * with the breakdown. The agent itself is unlimited under fair use.
 */
export function AgentUsageRing({ usage }: { usage: AgentUsageInfo }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The ring shows whichever allowance is furthest along.
  const pcts = [usage.images, usage.videos].filter(Boolean).map((m) => (m!.limit ? m!.used / m!.limit : 0));
  const pct = Math.min(1, pcts.length ? Math.max(...pcts) : 0);
  const R = 7;
  const C = 2 * Math.PI * R;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Plan usage: ${Math.round(pct * 100)}% of this month's AI allowance used`}
        title="Plan usage"
        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <circle cx="9" cy="9" r={R} fill="none" stroke="var(--line)" strokeWidth="2.5" />
          <circle
            cx="9"
            cy="9"
            r={R}
            fill="none"
            stroke={tone(pct)}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(pct * C, pct > 0 ? 2 : 0)} ${C}`}
            transform="rotate(-90 9 9)"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Plan usage"
          className="absolute bottom-full right-0 z-50 mb-2 w-[300px] rounded-2xl border border-line bg-surface p-4 text-left shadow-xl"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-[15px] font-semibold text-ink">Plan usage</span>
            {usage.planName ? <span className="text-[12px] text-muted">{usage.planName}</span> : null}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[13px] text-ink">AI agent</span>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: BLUE }}>
              Unlimited
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">Under our fair use policy.</p>

          {usage.images ? <Bar label="AI images" {...usage.images} /> : null}
          {usage.videos ? <Bar label="AI videos" {...usage.videos} /> : null}

          <p className="mt-4 text-[12px] text-muted">
            AI allowances reset on {usage.resets}.
            {usage.workspaces > 1 ? ` Shared across your ${usage.workspaces} workspaces.` : ""}
          </p>

          <div className="mt-3 border-t border-line pt-3">
            <Link href="/billing" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-blue-ink hover:underline">
              Plans and billing →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Bar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit ? Math.min(1, used / limit) : 0;
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-ink">{label}</span>
        <span className="tabular-nums text-muted">
          <span className="font-semibold text-ink">{used}</span> / {limit}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct * 100, used > 0 ? 3 : 0)}%`, background: tone(pct) }} />
      </div>
    </div>
  );
}
