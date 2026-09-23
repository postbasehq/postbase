"use client";

import { AppNav } from "@/components/AppNav";

/**
 * A faithful, static reproduction of the real Postbase app chrome — the same
 * transparent sidebar (logo, search, workspace switcher, the real AppNav) and
 * the same floating rounded content panel with a header. Marketing product
 * demos render their live screens inside this so the homepage shows the actual
 * app, not an approximation.
 */
export function AppShell({
  active,
  title,
  action,
  children,
  className = "",
  workspace = { name: "Berkway", sub: "5 channels" },
  sidebar = true,
}: {
  /** href of the nav item to highlight, e.g. "/composer". */
  active: string;
  /** Header title for the panel. */
  title: React.ReactNode;
  /** Optional header action (defaults to a "New post" button). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Workspace shown in the switcher (and the signed-in user chip). */
  workspace?: { name: string; sub: string; avatar?: string };
  /** Hide the app sidebar when the screen needs the full width. */
  sidebar?: boolean;
}) {
  return (
    <div
      className={`flex h-full overflow-hidden rounded-2xl border border-line ${className}`}
      style={{
        // Same backdrop as the real app layout.
        background:
          "radial-gradient(1000px 520px at 12% -8%, color-mix(in oklab, var(--blue-soft) 65%, transparent), transparent 70%), radial-gradient(900px 600px at 100% 110%, color-mix(in oklab, var(--blue-soft) 40%, transparent), transparent 65%), var(--ground)",
      }}
    >
      {/* sidebar — transparent, on the backdrop */}
      <aside className={`hidden w-[224px] shrink-0 flex-col py-1.5 ${sidebar ? "lg:flex" : ""}`}>
        <div className="flex h-14 shrink-0 items-center gap-2.5 px-5 font-display text-[18px] font-semibold tracking-[-0.02em] text-ink">
          <span className="size-[26px] shrink-0 overflow-hidden rounded-[24%] shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/postbase-icon.png" alt="" className="size-full object-cover" />
          </span>
          Postbase
        </div>

        {/* search */}
        <div className="px-3 pb-1">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface/60 px-3 py-2 text-[13px] text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Search
            <span className="ml-auto rounded border border-line px-1.5 text-[10px]">⌘K</span>
          </div>
        </div>

        {/* workspace switcher */}
        <div className="px-3 py-1.5">
          <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface/60 px-3 py-2">
            {workspace.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.avatar} alt="" className="size-6 rounded-md object-cover" />
            ) : (
              <span className="flex size-6 items-center justify-center rounded-md bg-blue font-display text-[11px] font-bold text-on-blue">
                {workspace.name.charAt(0)}
              </span>
            )}
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12.5px] font-semibold text-ink">{workspace.name}</div>
              <div className="truncate text-[10.5px] text-muted">{workspace.sub}</div>
            </div>
            <svg className="ml-auto text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        <AppNav active={active} frozen />

      </aside>

      {/* floating content panel */}
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col py-2.5 pl-2.5 pr-2.5 ${sidebar ? "lg:pl-0" : ""}`}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_18px_50px_-20px_rgba(16,24,40,0.35)]">
          <header className="flex h-14 shrink-0 items-center gap-3 px-5">
            <span className="font-display text-[16px] font-semibold text-ink">{title}</span>
            <div className="ml-auto flex items-center gap-2.5">
              {/* bell + theme toggle, as in the real header */}
              <span className="flex size-8 items-center justify-center rounded-full text-muted" aria-hidden>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </span>
              <span className="flex size-8 items-center justify-center rounded-full text-muted" aria-hidden>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </span>
              {action ?? (
                <span className="rounded-full bg-blue px-3.5 py-1.5 font-display text-[13px] font-semibold text-on-blue shadow-sm">
                  New post
                </span>
              )}
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
