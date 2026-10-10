"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotAvatar } from "@/components/postbots/BotAvatar";
import { NewBotButton } from "@/components/postbots/NewBotButton";
import type { BotColor, BotStatus } from "@/lib/postbots/types";

export type SidebarBot = {
  id: string;
  name: string;
  color: BotColor;
  status: BotStatus;
  preview: string;
  unread: boolean;
};

/** Postbots' sidebar: search, hire, and your bots with their latest message. */
export function BotsSidebar({ bots, onNavigate }: { bots: SidebarBot[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const q = query.trim().toLowerCase();
  const shown = q ? bots.filter((b) => b.name.toLowerCase().includes(q) || b.preview.toLowerCase().includes(q)) : bots;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        {searching ? (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => !query && setSearching(false)}
            onKeyDown={(e) => e.key === "Escape" && (setQuery(""), setSearching(false))}
            placeholder="Search bots"
            className="h-10 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
          />
        ) : (
          <span className="flex-1 font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">Postbots</span>
        )}
        {!searching ? (
          <button
            type="button"
            onClick={() => setSearching(true)}
            aria-label="Search bots"
            className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-surface-2"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        ) : null}
        <NewBotButton
          label="New bot"
          onDone={onNavigate}
          className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-surface-2"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </NewBotButton>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {shown.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted">{q ? "No bots match." : "No bots yet."}</p>
        ) : (
          shown.map((b) => {
            const active = pathname === `/bots/${b.id}`;
            return (
              <Link
                key={b.id}
                href={`/bots/${b.id}`}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${active ? "bg-surface-2" : "hover:bg-surface-2"}`}
              >
                <BotAvatar color={b.color} size={42} dot={b.status === "active" ? "green" : b.status === "paused" ? "amber" : null} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-[15px] text-ink ${b.unread ? "font-semibold" : "font-medium"}`}>{b.name}</span>
                    {b.unread ? <span className="size-2 shrink-0 rounded-full" style={{ background: "#2b59d9" }} aria-label="New messages" /> : null}
                  </span>
                  <span className="block truncate text-[13px] text-muted">{b.preview || "Say hello"}</span>
                </span>
              </Link>
            );
          })
        )}
      </nav>
    </div>
  );
}
