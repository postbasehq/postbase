"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Silently re-fetches the current server page (router.refresh keeps scroll,
 * filters and client state) while the tab is visible, and straight away when
 * the user comes back to it. Polls fast while something is in flight
 * (`active`), slowly otherwise. Renders nothing.
 */
export function AutoRefresh({ active, fastMs = 10_000, slowMs = 60_000 }: { active: boolean; fastMs?: number; slowMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const every = active ? fastMs : slowMs;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(tick, every);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, active, fastMs, slowMs]);

  return null;
}
