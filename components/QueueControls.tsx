"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandTile } from "@/components/BrandTile";

type Channel = { value: string; label: string };

/**
 * Content search + a brand-icon channel dropdown for the Queue toolbar. Both
 * drive URL params (`q`, `channel`) so filtering stays server-side and
 * shareable; status tabs and pagination live in the server page.
 */
export function QueueControls({ channels }: { channels: Channel[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const channel = sp.get("channel") ?? "";
  const current = channels.find((c) => c.value === channel) ?? null;

  function apply(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page"); // any filter change returns to page 1
    const s = params.toString();
    router.push(`/queue${s ? `?${s}` : ""}`);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(value: string) {
    setOpen(false);
    apply({ channel: value || undefined });
  }

  return (
    <>
      {/* content search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() || undefined });
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-blue sm:w-56"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-muted"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search content…"
          aria-label="Search posts by content"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted"
        />
        {q ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              apply({ q: undefined });
            }}
            className="shrink-0 text-muted transition-colors hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </form>

      {/* channel dropdown (brand icons) */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
        >
          {current ? (
            <BrandTile platform={current.value} size={16} radius={4} />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
            </svg>
          )}
          <span className="whitespace-nowrap">{current ? current.label : "All channels"}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={!channel}
              onClick={() => pick("")}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${
                !channel ? "bg-blue-soft text-blue-ink" : "text-ink hover:bg-surface-2"
              }`}
            >
              <span className="flex size-5 items-center justify-center text-muted">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
                </svg>
              </span>
              All channels
            </button>
            {channels.map((c) => (
              <button
                key={c.value}
                type="button"
                role="menuitemradio"
                aria-checked={channel === c.value}
                onClick={() => pick(c.value)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${
                  channel === c.value ? "bg-blue-soft text-blue-ink" : "text-ink hover:bg-surface-2"
                }`}
              >
                <BrandTile platform={c.value} size={20} radius={6} />
                {c.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
