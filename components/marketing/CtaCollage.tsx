"use client";

import { useState } from "react";
import { ClientLogo } from "@/components/ClientLogo";
import { AppNav } from "@/components/AppNav";
import { BrandTile } from "@/components/BrandTile";
import { useLoop } from "@/components/marketing/Mocks";

/*
 * Floating collage for the closing call to action, built from real Postbase UI:
 * the actual sidebar nav (AppNav), the calendar's header bar and day column,
 * the channels bar, and — for developers — the Developers page's key panel,
 * MCP client picker and connected apps. Each plays a small loop.
 */

const shadow = "shadow-[0_30px_60px_-24px_rgba(0,0,0,0.55)]";

function Floating({
  className,
  tilt,
  dur,
  delay = 0,
  children,
}: {
  className: string;
  tilt: number;
  dur: number;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`float-y absolute ${className}`}
      style={{ "--tilt": `${tilt}deg`, "--dur": `${dur}s`, "--delay": `${-delay}s` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/** The real sidebar: logo row + AppNav, faded out at the bottom. */
function NavCard({ active, offset = 0 }: { active: string; offset?: number }) {
  return (
    <div
      className={`h-[330px] w-[210px] overflow-hidden rounded-2xl bg-ground ${shadow}`}
      style={{
        maskImage: "linear-gradient(to bottom, #000 70%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 70%, transparent)",
      }}
    >
      <div className="flex h-12 items-center gap-2 px-4 font-display text-[15px] font-semibold tracking-[-0.02em] text-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/postbase-icon.png" alt="" className="size-[22px] rounded-[24%]" />
        Postbase
      </div>
      <div className="h-[282px] overflow-hidden">
        <div className="pointer-events-none origin-top-left scale-[0.9]" style={{ marginTop: -offset }}>
          <AppNav active={active} frozen />
        </div>
      </div>
    </div>
  );
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="swap-in inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-[12px] font-medium text-surface shadow-[0_20px_40px_-16px_rgba(0,0,0,0.6)]">
      <span className="flex size-4 items-center justify-center rounded-full bg-green text-[10px] font-bold text-white">✓</span>
      {children}
    </div>
  );
}

// ── Creators ─────────────────────────────────────────────────────────────

const HATCH: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(130,130,130,0.14) 5px, rgba(130,130,130,0.14) 6px)",
};
const PILL = {
  published: "bg-green/10 border-l-green",
  scheduled: "bg-blue-soft border-l-blue",
  draft: "bg-surface-2 border-l-muted",
};

function CreatorsCollage() {
  const [out, setOut] = useState(false);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setOut(false);
    await step(2200);
    setOut(true);
    await step(3600);
  });

  const pills: { hour: number; time: string; text: string; chans: string[]; status: keyof typeof PILL }[] = [
    { hour: 9, time: "09:00", text: "Fieldnote 2.4 is out", chans: ["x", "linkedin"], status: "published" },
    { hour: 12, time: "12:00", text: "New on the shelf: Kochere", chans: ["x", "linkedin", "bluesky"], status: out ? "published" : "scheduled" },
    { hour: 14, time: "14:15", text: "Cupping notes", chans: ["linkedin"], status: "scheduled" },
    { hour: 16, time: "16:30", text: "Studio tour", chans: ["mastodon"], status: "draft" },
  ];
  const hours = [9, 10, 11, 12, 13, 14, 15, 16];
  const ROW = 30;

  return (
    <div ref={ref} className="relative h-[430px]">
      <Floating className="left-0 top-10 z-0" tilt={-5} dur={8}>
        <NavCard active="/calendar" />
      </Floating>

      {/* calendar header bar */}
      <Floating className="right-0 top-0 z-20" tilt={2} dur={7} delay={1.5}>
        <div
          className={`flex items-center gap-2.5 rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2 px-3 py-2 ${shadow}`}
        >
          <span className="flex text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </span>
          <span className="font-display text-[14px] font-semibold tabular-nums text-ink">21 – 27 Sep 2026</span>
          <span className="rounded-lg border border-line px-2 py-0.5 text-[11px] font-semibold text-ink">Today</span>
          <span className="flex items-center gap-0.5 rounded-full bg-surface-2 p-0.5 text-[11px] font-semibold">
            <span className="px-2 py-0.5 text-muted">Day</span>
            <span className="rounded-full bg-blue px-2 py-0.5 text-on-blue">Week</span>
          </span>
        </div>
      </Floating>

      {/* today's column */}
      <Floating className="left-[150px] top-[78px] z-10" tilt={-1.5} dur={9} delay={3}>
        <div className={`w-[270px] overflow-hidden rounded-2xl border border-line bg-surface ${shadow}`}>
          <div className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-3 py-2">
            <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted">Wed</span>
            <span className="flex size-6 items-center justify-center rounded-full bg-blue font-display text-[12px] font-semibold text-on-blue">
              23
            </span>
          </div>
          <div className="relative" style={{ height: hours.length * ROW }}>
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute inset-x-0 flex border-b border-line/60"
                style={{ top: i * ROW, height: ROW, ...(h < 12 ? HATCH : null) }}
              >
                <span className="w-11 shrink-0 pr-1.5 pt-0.5 text-right text-[9.5px] tabular-nums text-muted">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
            {pills.map((p) => (
              <div
                key={p.time}
                className={`absolute left-12 right-2 flex items-center gap-1.5 rounded-md border border-l-[3px] border-line px-1.5 text-[10.5px] text-ink shadow-sm transition-colors duration-500 ${PILL[p.status]}`}
                style={{ top: (p.hour - 9) * ROW + 4, height: ROW - 8 }}
              >
                <span className="flex shrink-0 -space-x-1">
                  {p.chans.map((c) => (
                    <span key={c} className="rounded-[4px] ring-1 ring-surface">
                      <BrandTile platform={c} size={12} radius={4} />
                    </span>
                  ))}
                </span>
                <span className="tabular-nums text-muted">{p.time}</span>
                <span className="truncate">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </Floating>

      {/* manage channels bar */}
      <Floating className="bottom-2 right-0 z-30" tilt={3} dur={7.5} delay={0.8}>
        <div className={`flex items-center gap-4 rounded-2xl bg-surface px-4 py-3 ${shadow}`}>
          <span className="font-display text-[13px] font-semibold text-ink">Manage channels</span>
          <span className="flex items-center">
            {["x", "linkedin", "instagram", "tiktok", "bluesky", "mastodon"].map((p, i, all) => (
              <span
                key={p}
                style={{ marginLeft: i === 0 ? 0 : -3, transform: `rotate(${(i - (all.length - 1) / 2) * 6}deg)`, zIndex: i }}
                className={`relative rounded-[7px] bg-surface p-[2px] shadow-sm ring-1 ring-line ${
                  ["instagram", "tiktok"].includes(p) ? "opacity-45 grayscale" : ""
                }`}
              >
                <BrandTile platform={p} size={20} radius={5} />
              </span>
            ))}
            <span className="relative ml-1.5 flex size-6 items-center justify-center rounded-[7px] bg-surface text-blue-ink shadow-sm ring-1 ring-line">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </span>
        </div>
      </Floating>

      <div className="absolute bottom-[86px] left-[90px] z-40 min-h-9">
        {out ? <Toast>Published to X, LinkedIn and Bluesky</Toast> : null}
      </div>
    </div>
  );
}

// ── Developers ───────────────────────────────────────────────────────────

const CLIENTS = [
  { id: "claude", name: "Claude Desktop" },
  { id: "cursor", name: "Cursor" },
  { id: "vscode", name: "VS Code" },
];

function DevelopersCollage() {
  const [copied, setCopied] = useState(false);
  const [claude, setClaude] = useState(true);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setCopied(false);
    setClaude(false);
    await step(1800);
    setCopied(true);
    await step(1400);
    setClaude(true);
    await step(3400);
  });

  return (
    <div ref={ref} className="relative h-[430px]">
      <Floating className="left-0 top-10 z-0" tilt={-5} dur={8}>
        <NavCard active="/api-keys" offset={240} />
      </Floating>

      {/* revealed key */}
      <Floating className="right-0 top-0 z-20" tilt={2} dur={7} delay={1.5}>
        <div className={`w-[330px] rounded-2xl bg-surface p-2.5 ${shadow}`}>
          <div className="rounded-xl border border-blue bg-blue-soft/60 p-3">
            <p className="text-[12px] font-semibold text-blue-ink">Copy your key now — you won&apos;t see it again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-2.5 py-1.5 font-mono text-[11.5px] text-ink ring-1 ring-line">
                pb_live_Qm7xT2vLr9KcH0sWbN8y…4f2a
              </code>
              <span
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  copied ? "bg-green text-white" : "bg-blue text-on-blue"
                }`}
              >
                {copied ? "Copied" : "Copy"}
              </span>
            </div>
          </div>
        </div>
      </Floating>

      {/* MCP client picker */}
      <Floating className="left-[130px] top-[112px] z-10" tilt={-1.5} dur={9} delay={3}>
        <div className={`w-[300px] rounded-2xl bg-surface p-3.5 ${shadow}`}>
          <div className="font-display text-[13px] font-semibold text-ink">MCP client configuration</div>
          <p className="mb-1.5 mt-3 text-[11px] font-semibold text-muted">Authentication</p>
          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/50 p-0.5 text-[11px] font-semibold">
            <span className="rounded-full bg-blue px-2.5 py-1 text-on-blue">Sign in with Postbase</span>
            <span className="px-2.5 py-1 text-muted">API key</span>
          </div>
          <p className="mb-1.5 mt-3 text-[11px] font-semibold text-muted">Client</p>
          <div className="flex flex-wrap gap-1.5">
            {CLIENTS.map((c, i) => (
              <span
                key={c.name}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11.5px] font-semibold ${
                  i === 0 ? "border-blue bg-blue-soft text-blue-ink" : "border-line text-ink"
                }`}
              >
                <ClientLogo id={c.id} size={20} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </Floating>

      {/* connected apps */}
      <Floating className="-bottom-4 right-0 z-30" tilt={3} dur={7.5} delay={0.8}>
        <div className={`w-[300px] overflow-hidden rounded-2xl bg-surface ${shadow}`}>
          <div className="border-b border-line px-3.5 py-2.5 font-display text-[13px] font-semibold text-ink">Connected apps</div>
          {(claude ? ["Claude", "Cursor"] : ["Cursor"]).map((name) => (
            <div key={name} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${name === "Claude" ? "swap-in border-b border-line" : ""}`}>
              <span className="grid size-7 place-items-center rounded-lg bg-surface-2 text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <div className="min-w-0 leading-tight">
                <div className="text-[12.5px] font-semibold text-ink">{name}</div>
                <div className="truncate text-[10.5px] text-muted">
                  Halden Coffee · {name === "Claude" ? "connected just now" : "connected 14 Sep 2026"}
                </div>
              </div>
              <span className="ml-auto text-[11px] font-semibold text-muted">Revoke</span>
            </div>
          ))}
        </div>
      </Floating>

      <div className="absolute bottom-[18px] left-[10px] z-40 min-h-9">
        {claude ? <Toast>Claude connected to Halden Coffee</Toast> : null}
      </div>
    </div>
  );
}

export function CtaCollage({ developers }: { developers: boolean }) {
  return developers ? <DevelopersCollage /> : <CreatorsCollage />;
}
