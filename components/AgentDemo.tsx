"use client";

import { useEffect, useState } from "react";
import { BrandTile } from "@/components/BrandTile";

type Scenario = {
  chip: string;
  prompt: string;
  channels: string[];
  when: string;
  body: string;
};

const SCENARIOS: Scenario[] = [
  {
    chip: "Launch thread",
    prompt: "Schedule a launch thread for 9am tomorrow to X and LinkedIn",
    channels: ["x", "linkedin"],
    when: "Tomorrow · 9:00 AM",
    body: "🚀 Today we're launching…",
  },
  {
    chip: "Product reel",
    prompt: "Queue my product reel for Friday 6pm on Instagram and TikTok",
    channels: ["instagram", "tiktok"],
    when: "Friday · 6:00 PM",
    body: "New product reel — watch it in action",
  },
  {
    chip: "Weekly recap",
    prompt: "Post a weekly recap to X and YouTube on Sunday at noon",
    channels: ["x", "youtube"],
    when: "Sunday · 12:00 PM",
    body: "This week at Postbase, in 60 seconds ↓",
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = "typing" | "working" | "done";

export function AgentDemo() {
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = SCENARIOS[active];
      setPhase("typing");
      setTyped("");
      for (let i = 1; i <= s.prompt.length && !cancelled; i++) {
        setTyped(s.prompt.slice(0, i));
        await sleep(24);
      }
      if (cancelled) return;
      await sleep(420);
      setPhase("working");
      await sleep(1500);
      if (cancelled) return;
      setPhase("done");
      await sleep(3600);
      if (cancelled) return;
      setActive((a) => (a + 1) % SCENARIOS.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const s = SCENARIOS[active];

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex size-5 items-center justify-center rounded-md bg-ink text-[10px] font-bold text-surface">
          ⌘
        </span>
        <span className="font-display text-[13px] font-semibold">Your AI agent</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted">
          <span className="size-1.5 rounded-full bg-green" />
          MCP connected
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* the prompt (typed) */}
        <div className="self-end rounded-2xl rounded-br-sm bg-blue px-3.5 py-2 text-[13px] text-on-blue">
          {typed}
          {phase === "typing" ? <span className="ml-0.5 animate-pulse">▌</span> : null}
        </div>

        {/* agent working → tool calls */}
        {phase !== "typing" ? (
          <div className="flex flex-col gap-1.5">
            <ToolLine label="list_channels" done />
            <ToolLine label="create_post" done={phase === "done"} />
          </div>
        ) : null}

        {/* result card slides in */}
        {phase === "done" ? (
          <div className="animate-[fadeUp_320ms_ease-out] rounded-xl border border-blue/40 bg-blue-soft/40 p-3 ring-1 ring-blue/20">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-green">✓ Scheduled</span>
              <span className="ml-auto font-display text-[12px] font-semibold tabular-nums text-ink">
                {s.when}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {s.channels.map((c) => (
                  <span key={c} className="rounded-[7px] ring-2 ring-surface">
                    <BrandTile platform={c} size={22} radius={7} />
                  </span>
                ))}
              </div>
              <span className="truncate text-[13px]">{s.body}</span>
            </div>
          </div>
        ) : (
          // reserve space so the card doesn't jump
          <div className="h-[74px] rounded-xl border border-dashed border-line/70" />
        )}

        {/* scenario chips (clickable) */}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {SCENARIOS.map((sc, i) => (
            <button
              key={sc.chip}
              onClick={() => setActive(i)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                i === active
                  ? "bg-ink text-surface"
                  : "border border-line text-muted hover:text-ink"
              }`}
            >
              {sc.chip}
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
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
      <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink">
        {label}
      </code>
      <span className="text-muted">{done ? "done" : "running"}</span>
    </div>
  );
}
