"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Shared loop hook for the homepage's animated product shots, plus the /agent
 * composer mock. Loops play while on screen (static with reduced motion).
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
