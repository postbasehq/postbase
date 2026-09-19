"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type Notice = {
  id: string;
  postId: string;
  platform: string;
  body: string;
  error: string | null;
};

// Solid brand red (not the salmon --terra token).
const RED = "#d14a3e";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export function NotificationBell({ items }: { items: Notice[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={count > 0 ? `${count} notifications` : "Notifications"}
        className="relative flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-4 text-white"
            style={{ background: RED }}
          >
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between px-4 pb-1.5 pt-3.5">
            <span className="font-display text-sm font-semibold text-ink">Notifications</span>
            {count > 0 ? (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: RED }}
              >
                {count} failed
              </span>
            ) : null}
          </div>

          {count === 0 ? (
            <div className="px-4 pb-7 pt-3 text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-surface">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-green,#188038)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <p className="text-sm text-muted">You’re all caught up.</p>
            </div>
          ) : (
            <>
              <div className="max-h-96 space-y-0.5 overflow-y-auto px-2 pb-1">
                {items.map((n) => (
                  <Link
                    key={n.id}
                    href="/queue"
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-surface"
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: RED }} />
                      <span className="text-sm font-semibold text-ink">
                        {PLATFORM_LABEL[n.platform] ?? n.platform} delivery failed
                      </span>
                    </div>
                    <div className="mt-1 truncate pl-4 text-xs text-muted">{n.body || "(no text)"}</div>
                    {n.error ? (
                      <div className="mt-0.5 line-clamp-2 pl-4 text-xs" style={{ color: RED }}>
                        {n.error}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
              <div className="p-2">
                <Link
                  href="/queue"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl bg-surface px-4 py-2.5 text-center text-xs font-semibold text-blue-ink transition-colors hover:bg-blue-soft"
                >
                  Go to queue to retry
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
