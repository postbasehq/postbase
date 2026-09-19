"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AgentSidebar } from "@/components/AgentSidebar";

/**
 * Swaps the app sidebar's middle section (search + org switcher + nav) for the
 * agent's conversation list while on /agent. A collapse toggle lets you peek the
 * normal nav without leaving the chat, and jump back to conversations. The Logo
 * (above) and UserMenu (below) stay put in the layout.
 */
export function SidebarSwitcher({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const onAgent = pathname === "/agent" || pathname.startsWith("/agent/");
  const [showNav, setShowNav] = useState(false);

  // Entering /agent always starts on the conversation list.
  useEffect(() => {
    if (!onAgent) setShowNav(false);
  }, [onAgent]);

  if (!onAgent) return <>{children}</>;

  if (showNav) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowNav(false)}
          className="mx-3 mb-1 mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to conversations
        </button>
        {children}
      </>
    );
  }
  return <AgentSidebar onShowNav={() => setShowNav(true)} />;
}
