"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/*
 * A thin solid-blue bar along the top of the content panel while an in-app
 * navigation loads. The current page stays on screen meanwhile (no skeleton).
 *
 * App Router has no navigation events, so it starts on a click of a same-site
 * link to another URL and finishes when the URL changes. It only appears after
 * a short delay, so fast navigations never flash it.
 */
const SHOW_AFTER_MS = 120;
const GIVE_UP_MS = 15_000; // a navigation that never lands (offline, cancelled)

type Phase = "idle" | "loading" | "finishing";

export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Start on a click of an internal link that goes somewhere else.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Capture phase: next/link calls preventDefault itself, so don't check it.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      clear();
      setVisible(false); // restart from 0, unseen, even if the last one is still fading
      setPhase("loading");
      timers.current.push(
        window.setTimeout(() => setVisible(true), SHOW_AFTER_MS),
        window.setTimeout(() => {
          setPhase("idle");
          setVisible(false);
        }, GIVE_UP_MS),
      );
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The URL changed: the new page is in. Run the bar to the end, then hide it.
  useEffect(() => {
    clear();
    setPhase((p) => (p === "idle" ? p : "finishing"));
    timers.current.push(
      window.setTimeout(() => {
        setPhase("idle");
        setVisible(false);
      }, 260),
    );
    return clear;
  }, [pathname, search]);

  const on = visible && phase !== "idle";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-[2px]" aria-hidden>
      <div
        className="h-full bg-[#2b59d9]"
        style={{
          // Grows slowly towards 85% while loading, runs to the end when the page
          // lands, then fades at full width. It resets to 0 unseen (before the
          // next one shows).
          width: phase === "loading" ? (visible ? "85%" : "0%") : "100%",
          opacity: on ? 1 : 0,
          transition: !on
            ? "opacity 220ms ease"
            : phase === "finishing"
              ? "width 180ms ease-out"
              : "width 8s cubic-bezier(0.1, 0.7, 0.2, 1)",
        }}
      />
    </div>
  );
}
