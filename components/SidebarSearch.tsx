"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Quick-nav destinations (mirrors the sidebar nav). Keywords widen matches.
const PAGES: { label: string; href: string; keywords?: string }[] = [
  { label: "Calendar", href: "/calendar", keywords: "schedule posts week month" },
  { label: "Queue", href: "/queue", keywords: "posts delivery status retry failed published" },
  { label: "Composer", href: "/composer", keywords: "new post write create" },
  { label: "Drafts", href: "/drafts", keywords: "unscheduled saved unpublished work in progress" },
  { label: "Channels", href: "/channels", keywords: "connect accounts social x instagram" },
  { label: "Media", href: "/media", keywords: "library images video uploads" },
  { label: "Analytics", href: "/analytics", keywords: "metrics stats engagement" },
  { label: "MCP & API", href: "/api-keys", keywords: "keys tokens integration developer" },
  { label: "Team", href: "/team", keywords: "members invites workspace" },
  { label: "Billing", href: "/billing", keywords: "plan subscription payment upgrade" },
  { label: "Settings", href: "/settings", keywords: "preferences account" },
];

export function SidebarSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PAGES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.keywords?.includes(q),
    ).slice(0, 6);
  }, [query]);

  // ⌘K / Ctrl+K focuses the search; Escape closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  function go(href: string) {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    router.push(href);
  }

  return (
    <div ref={wrapRef} className="relative shrink-0 px-3 pb-2">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface/60 px-2.5 focus-within:border-blue">
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
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={(e) => {
            if (!results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[active].href);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search…"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted"
        />
        <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] font-medium text-muted md:block">
          ⌘K
        </kbd>
      </div>

      {open && results.length > 0 ? (
        <div className="absolute inset-x-3 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-lg">
          {results.map((r, i) => (
            <button
              key={r.href}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.href)}
              className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm ${
                i === active ? "bg-blue-soft text-blue-ink" : "text-ink hover:bg-surface-2"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
