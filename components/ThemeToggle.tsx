"use client";

import { useEffect, useState } from "react";
import { THEME_KEY, applyTheme, readThemeChoice } from "@/lib/theme";

function effectiveIsDark(): boolean {
  const current = document.documentElement.getAttribute("data-theme");
  if (current) return current === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(effectiveIsDark());
    setMounted(true);
    // Follow the page's actual theme, however it changes: this toggle, the
    // Settings picker, another tab, or the OS setting under "Match system".
    const sync = () => setDark(effectiveIsDark());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) applyTheme(readThemeChoice());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggle() {
    // An explicit choice: remember it over the dark default.
    applyTheme(effectiveIsDark() ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
    >
      {mounted && dark ? (
        // sun — click to switch to light
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // moon — click to switch to dark
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
