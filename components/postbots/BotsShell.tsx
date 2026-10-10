"use client";

import { useState } from "react";
import Link from "next/link";
import { BotsSidebar, type SidebarBot } from "@/components/postbots/BotsSidebar";
import { UserMenu } from "@/components/UserMenu";

/**
 * The Postbots app frame: its own chat-first layout, separate from the
 * Postbase scheduler's sidebar. Bots on the left (a drawer on phones), the
 * open chat on the right.
 */
export function BotsShell({
  bots,
  user,
  children,
}: {
  bots: SidebarBot[];
  user: { name: string; email: string; avatarUrl?: string };
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);

  const footer = (
    <div className="flex shrink-0 items-end gap-2 pr-3">
      <div className="min-w-0 flex-1">
        <UserMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
      </div>
      <Link
        href="/calendar"
        className="mb-4 shrink-0 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:bg-surface-2"
      >
        Postbase
      </Link>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-ground">
      <aside className="hidden w-80 shrink-0 flex-col border-r border-line md:flex">
        <BotsSidebar bots={bots} />
        {footer}
      </aside>

      {drawer ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-80 flex-col bg-ground shadow-xl">
            <BotsSidebar bots={bots} onNavigate={() => setDrawer(false)} />
            {footer}
          </aside>
        </div>
      ) : null}

      <main className="relative flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Open bots"
          className="absolute left-3 top-3 z-10 flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-surface-2 md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        {children}
      </main>
    </div>
  );
}
