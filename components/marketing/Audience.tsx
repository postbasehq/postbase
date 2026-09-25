"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Audience = "creators" | "developers";

const AudienceContext = createContext<{
  audience: Audience;
  setAudience: (a: Audience) => void;
}>({ audience: "creators", setAudience: () => {} });

export const useAudience = () => useContext(AudienceContext);

/** Holds the homepage's creators/developers view, mirrored to `/` vs `/developers`. */
export function AudienceProvider({ initial = "creators", children }: { initial?: Audience; children: React.ReactNode }) {
  const [audience, setState] = useState<Audience>(initial);

  // Old links used ?for=developers; honour them.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("for") === "developers") {
      setState("developers");
    }
  }, []);

  // The two views live at / and /developers; switching updates the address in
  // place (both routes render the same page) so each view has a real URL.
  const setAudience = useCallback((a: Audience) => {
    setState(a);
    const url = new URL(window.location.href);
    url.searchParams.delete("for");
    url.pathname = a === "developers" ? "/developers" : "/";
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <AudienceContext.Provider value={{ audience, setAudience }}>
      {children}
    </AudienceContext.Provider>
  );
}

/** "For creators ⏺ For developers" switch. `compact` is the version in the nav. */
export function AudienceToggle({ compact = false }: { compact?: boolean }) {
  const { audience, setAudience } = useAudience();
  const dev = audience === "developers";
  const label = `font-display font-semibold transition-colors ${compact ? "text-[13px]" : "text-[15px]"}`;
  return (
    <div className={`inline-flex items-center ${compact ? "gap-2" : "gap-3"}`}>
      <button
        type="button"
        onClick={() => setAudience("creators")}
        className={`${label} ${dev ? "text-muted hover:text-ink" : "text-ink"}`}
      >
        For creators
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={dev}
        aria-label="Show Postbase for developers"
        onClick={() => setAudience(dev ? "creators" : "developers")}
        className={`relative shrink-0 rounded-full transition-colors duration-300 ${dev ? "bg-[#d14a3e]" : "bg-[#2b59d9]"} ${compact ? "" : "shadow-inner"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
          compact ? "h-5 w-9" : "h-7 w-12"
        }`}
      >
        <span
          aria-hidden
          className={`absolute left-1 top-1 rounded-full bg-white ${compact ? "" : "shadow"} transition-transform duration-300 ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none ${
            compact ? "size-3" : "size-5"
          }`}
          style={{ transform: dev ? `translateX(${compact ? 16 : 20}px)` : "none" }}
        />
      </button>
      <button
        type="button"
        onClick={() => setAudience("developers")}
        className={`${label} ${dev ? "text-ink" : "text-muted hover:text-ink"}`}
      >
        For developers
      </button>
    </div>
  );
}

/** Re-mounts its children with a short fade-up whenever `k` changes. */
export function Swap({ k, children, className = "" }: { k: string; children: React.ReactNode; className?: string }) {
  return (
    <div key={k} className={`swap-in ${className}`}>
      {children}
    </div>
  );
}
