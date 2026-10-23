"use client";

import { Logo } from "@/components/Logo";
import { MobileNav } from "@/components/MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { BotActivityProvider } from "@/components/postbots/BotActivity";
import { ConnectApps } from "@/components/postbots/ConnectApps";
import { BotsSidebar, type SidebarBot } from "@/components/postbots/BotsSidebar";
import { botsHref } from "@/lib/hosts";

/**
 * The Postbots app frame, in the same frame as the Postbase app: bots on the
 * backdrop to the left (a drawer on phones), the open chat in the floating
 * panel on the right.
 */
export function BotsShell({
  bots,
  inboxCount,
  user,
  children,
}: {
  bots: SidebarBot[];
  /** Open items in the team inbox. */
  inboxCount: number;
  user: { name: string; email: string; avatarUrl?: string };
  children: React.ReactNode;
}) {
  return (
    <BotActivityProvider>
      <div className="flex h-dvh flex-col overflow-hidden">
        <div
          className="flex min-h-0 flex-1 overflow-hidden bg-ground"
        >
          <aside className="hidden w-72 shrink-0 flex-col md:flex">
            <div className="flex h-16 shrink-0 items-center px-5">
              <Logo href={botsHref("/bots")} name="Postbots" />
            </div>
            <BotsSidebar bots={bots} inboxCount={inboxCount} />
            <div className="shrink-0 px-3 pt-1">
              <ConnectApps />
            </div>
            <UserMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2 md:py-3 md:pl-0 md:pr-3">
            <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_50px_-20px_rgba(16,24,40,0.35)]">
              {/* Phones: the bots list opens as a drawer from here. */}
              <div className="absolute left-3 top-3.5 z-10 md:hidden">
                <MobileNav
                  header={<Logo href={botsHref("/bots")} name="Postbots" />}
                  footer={
                    <div className="flex items-end gap-1 pr-3">
                      <div className="min-w-0 flex-1">
                        <UserMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
                      </div>
                      <div className="pb-4">
                        <ThemeToggle />
                      </div>
                    </div>
                  }
                >
                  <BotsSidebar bots={bots} inboxCount={inboxCount} />
                  <div className="shrink-0 px-3 pt-1">
                    <ConnectApps />
                  </div>
                </MobileNav>
              </div>
              {children}
            </main>
          </div>
        </div>
      </div>
    </BotActivityProvider>
  );
}
