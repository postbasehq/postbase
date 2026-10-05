"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Shared body for the error boundaries: says what happened in plain words,
 * offers Try again (re-renders the segment) and a way home, and reports the
 * error to Sentry (a no-op when Sentry isn't configured).
 */
export function ErrorView({
  error,
  reset,
  home = "/",
  homeLabel = "Go to the homepage",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  home?: string;
  homeLabel?: string;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[520px] px-4 py-20 text-center">
      <p className="font-mono text-[13px] font-medium text-muted">Something went wrong</p>
      <h1 className="mt-4 text-balance font-display text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
        This page hit a snag
      </h1>
      <p className="mx-auto mt-4 max-w-[44ch] text-balance text-[15px] leading-relaxed text-muted">
        It&apos;s on our side, not yours, and we&apos;ve been told about it. Try again in a moment. Your posts and
        scheduled sends aren&apos;t affected.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
        >
          Try again
        </button>
        <a href={home} className="rounded-full border border-line px-5 py-2.5 font-display text-sm font-semibold text-ink transition-colors hover:bg-surface-2">
          {homeLabel}
        </a>
      </div>
      {error.digest ? <p className="mt-8 font-mono text-[11px] text-muted">Reference: {error.digest}</p> : null}
    </div>
  );
}
