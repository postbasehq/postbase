"use client";

import { useEffect, useState } from "react";
import { BrandTile } from "@/components/BrandTile";

type Scenario = {
  chip: string;
  prompt: string;
  channels: string[];
  when: string;
  body: string;
  day: number; // 0-6 (Mon-Sun) in the mini calendar
  row: number; // 0-2 → 9 AM / 12 PM / 6 PM
};

const SCENARIOS: Scenario[] = [
  {
    chip: "Launch thread",
    prompt: "Schedule a launch thread for 9am Tuesday to X and LinkedIn",
    channels: ["x", "linkedin"],
    when: "Tue · 9:00 AM",
    body: "🚀 Today we're launching…",
    day: 1,
    row: 0,
  },
  {
    chip: "Product reel",
    prompt: "Queue my product reel for Friday 6pm on Instagram and TikTok",
    channels: ["instagram", "tiktok"],
    when: "Fri · 6:00 PM",
    body: "New product reel — watch it",
    day: 4,
    row: 2,
  },
  {
    chip: "Weekly recap",
    prompt: "Post a weekly recap to X and YouTube on Sunday at noon",
    channels: ["x", "youtube"],
    when: "Sun · 12:00 PM",
    body: "This week, in 60 seconds ↓",
    day: 6,
    row: 1,
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ROWS = ["9 AM", "12 PM", "6 PM"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = "typing" | "working" | "done";

export function AgentDemo() {
  const [active, setActive] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = SCENARIOS[active];
      setPhase("typing");
      setChars(0);
      for (let i = 1; i <= s.prompt.length && !cancelled; i++) {
        setChars(i);
        await sleep(22);
      }
      if (cancelled) return;
      await sleep(400);
      setPhase("working");
      await sleep(1500);
      if (cancelled) return;
      setPhase("done");
      await sleep(3800);
      if (cancelled) return;
      setActive((a) => (a + 1) % SCENARIOS.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const s = SCENARIOS[active];

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex size-5 items-center justify-center rounded-md bg-ink text-[10px] font-bold text-surface">
          ⌘
        </span>
        <span className="font-display text-[13px] font-semibold">Your AI agent</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted">
          @postbasehq/mcp
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted">
          <span className="size-1.5 rounded-full bg-green" />
          MCP connected
        </span>
      </div>

      <div className="grid gap-0 md:grid-cols-2">
        {/* LEFT — the conversation */}
        <div className="flex flex-col gap-3 border-b border-line p-4 md:border-b-0 md:border-r">
          <div className="self-end rounded-2xl rounded-br-sm bg-blue px-3.5 py-2 text-left text-[13px] text-on-blue">
            {s.prompt.slice(0, chars)}
            {phase === "typing" ? <span className="ml-0.5 animate-pulse">▌</span> : null}
          </div>

          {phase !== "typing" ? (
            <div className="flex flex-col gap-1.5">
              <ToolLine label="list_channels" done />
              <ToolLine label="create_post" done={phase === "done"} />
            </div>
          ) : null}

          {phase === "done" ? (
            <div className="animate-[fadeUp_320ms_ease-out] self-start rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2 text-[13px]">
              Done — scheduled to{" "}
              <b>
                {s.channels
                  .map((c) => (c === "x" ? "X" : c[0].toUpperCase() + c.slice(1)))
                  .join(" & ")}
              </b>{" "}
              for <b>{s.when}</b>. ✓
            </div>
          ) : null}
        </div>

        {/* RIGHT — the post landing on the calendar */}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-display text-[12px] font-semibold text-muted">This week</span>
            <span className="ml-auto text-[11px] text-muted">Calendar</span>
          </div>
          <MiniCalendar scenario={s} phase={phase} />
        </div>
      </div>

      {/* scenario chips */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-3">
        <span className="mr-1 text-[11px] text-muted">Try:</span>
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.chip}
            onClick={() => setActive(i)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              i === active ? "bg-ink text-surface" : "border border-line text-muted hover:text-ink"
            }`}
          >
            {sc.chip}
          </button>
        ))}
      </div>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes popIn{0%{opacity:0;transform:scale(.9)}60%{transform:scale(1.03)}100%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function MiniCalendar({ scenario, phase }: { scenario: Scenario; phase: Phase }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {/* day header */}
      <div className="grid grid-cols-[34px_repeat(7,1fr)] border-b border-line bg-surface-2/40">
        <div />
        {DAYS.map((d, i) => (
          <div
            key={d}
            className={`py-1 text-center text-[9px] font-semibold uppercase ${
              i === scenario.day ? "text-blue-ink" : "text-muted"
            }`}
          >
            {d[0]}
          </div>
        ))}
      </div>
      {/* rows */}
      {ROWS.map((label, r) => (
        <div key={label} className="grid grid-cols-[34px_repeat(7,1fr)] border-b border-line last:border-b-0">
          <div className="flex items-center justify-end pr-1.5 text-[9px] tabular-nums text-muted">
            {label}
          </div>
          {DAYS.map((_, c) => {
            const isTarget = c === scenario.day && r === scenario.row;
            const filled = isTarget && phase === "done";
            const aiming = isTarget && phase === "working";
            return (
              <div key={c} className="relative h-10 border-l border-line/60">
                {aiming ? (
                  <div className="absolute inset-1 rounded-md border border-dashed border-blue/60" />
                ) : null}
                {filled ? (
                  <div
                    style={{ animation: "popIn 360ms ease-out" }}
                    className="absolute inset-1 flex items-center gap-1 rounded-md bg-blue-soft px-1 ring-1 ring-blue/30"
                  >
                    <span className="flex -space-x-1">
                      {scenario.channels.map((ch) => (
                        <span key={ch} className="rounded-[5px] ring-1 ring-surface">
                          <BrandTile platform={ch} size={14} radius={5} />
                        </span>
                      ))}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ToolLine({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        className={`flex size-4 items-center justify-center rounded-full text-[9px] ${
          done ? "bg-green/15 text-green" : "bg-amber-bright/20 text-amber"
        }`}
      >
        {done ? "✓" : "…"}
      </span>
      <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink">{label}</code>
      <span className="text-muted">{done ? "done" : "running"}</span>
    </div>
  );
}
