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
}: {
  /** href of the nav item to highlight, e.g. "/composer". */
  active: string;
  /** Header title for the panel. */
  title: React.ReactNode;
  /** Optional header action (defaults to a "New post" button). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex overflow-hidden rounded-2xl border border-line ${className}`}
      style={{
        background:
          "radial-gradient(900px 460px at 8% -10%, color-mix(in oklab, var(--blue-soft) 70%, transparent), transparent 70%), radial-gradient(760px 520px at 102% 112%, color-mix(in oklab, var(--blue-soft) 44%, transparent), transparent 66%), var(--ground)",
      }}
    >
      {/* sidebar — transparent, on the backdrop */}
      <aside className="hidden w-[224px] shrink-0 flex-col py-1.5 lg:flex">
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
            <span className="flex size-6 items-center justify-center rounded-md bg-blue font-display text-[11px] font-bold text-on-blue">
              B
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12.5px] font-semibold text-ink">Berkway</div>
              <div className="truncate text-[10.5px] text-muted">5 channels</div>
            </div>
            <svg className="ml-auto text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        <AppNav active={active} frozen />

        {/* user chip */}
        <div className="mt-auto px-3 pb-1 pt-2">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-terra font-display text-[12px] font-semibold text-white">
              S
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12.5px] font-semibold text-ink">Syed Shah</div>
              <div className="truncate text-[10.5px] text-muted">Owner</div>
            </div>
          </div>
        </div>
      </aside>

      {/* floating content panel */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col py-2.5 pl-2.5 lg:pl-0 lg:pr-2.5">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_18px_50px_-20px_rgba(16,24,40,0.35)]">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line/70 px-5">
            <span className="font-display text-[16px] font-semibold text-ink">{title}</span>
            <div className="ml-auto flex items-center gap-2.5">
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
