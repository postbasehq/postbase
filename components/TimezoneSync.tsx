"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Records the viewer's timezone in a cookie so server components can format times
 * correctly. Refreshes once when it first sets/changes the value.
 */
export function TimezoneSync() {
  const router = useRouter();
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const current = document.cookie
        .split("; ")
        .find((c) => c.startsWith("pb_tz="))
        ?.split("=")[1];
      if (tz && decodeURIComponent(current ?? "") !== tz) {
        document.cookie = `pb_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }
    } catch {
      // Intl unavailable — leave the default (UTC)
    }
  }, [router]);
  return null;
}
