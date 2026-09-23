"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Shared loop hook for the homepage's animated product shots. Loops play
 * while on screen (static with reduced motion).
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
