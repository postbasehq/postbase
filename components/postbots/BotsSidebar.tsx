"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotAvatar } from "@/components/postbots/BotAvatar";
import { useBotActivity } from "@/components/postbots/BotActivity";
import type { BotColor, BotStatus } from "@/lib/postbots/types";
import { botsHref } from "@/lib/hosts";

/** On the bots host the address is the clean path ("/abc"), elsewhere "/bots/abc". */
const isAt = (pathname: string, botsPath: string) => pathname === botsPath || pathname === botsHref(botsPath);

export type SidebarBot = {
  id: string;
  name: string;
  color: BotColor;
  status: BotStatus;
  preview: string;
  unread: boolean;
};

/** Postbots' sidebar: search, hire, and your bots with their latest message. */
export function BotsSidebar({ bots }: { bots: SidebarBot[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const q = query.trim().toLowerCase();
  const shown = q ? bots.filter((b) => b.name.toLowerCase().includes(q) || b.preview.toLowerCase().includes(q)) : bots;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 pl-5 pr-3">
        {searching ? (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => !query && setSearching(false)}
            onKeyDown={(e) => e.key === "Escape" && (setQuery(""), setSearching(false))}
            placeholder="Search bots"
            className="h-9 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-blue"
          />
        ) : (
          <span className="flex-1 text-[13px] font-semibold text-muted">Your bots</span>
        )}
        {!searching ? (
          <button
            type="button"
            onClick={() => setSearching(true)}
            aria-label="Search bots"
            className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        ) : null}
        <Link
          href={botsHref("/bots/new")}
          aria-label="New chat"
          title="New chat"
          className={`flex size-9 items-center justify-center rounded-full transition hover:bg-surface-2 hover:text-ink ${
            isAt(pathname, "/bots/new") ? "bg-surface-2 text-ink" : "text-muted"
          }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {shown.length === 0 ? (
          // With no bots at all the main panel says so; only a search needs a note.
          q ? <p className="px-3 py-6 text-sm text-muted">No bots match.</p> : null
        ) : (
          shown.map((b) => {
            const active = isAt(pathname, `/bots/${b.id}`);
            return (
              <Link
                key={b.id}
                href={botsHref(`/bots/${b.id}`)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${active ? "bg-surface shadow-sm" : "hover:bg-surface-2"}`}
              >
                <SidebarAvatar bot={b} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-[15px] text-ink ${b.unread ? "font-semibold" : "font-medium"}`}>{b.name}</span>
                    {b.unread ? <span className="size-2 shrink-0 rounded-full bg-blue" aria-label="New messages" /> : null}
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

/** A bot's face in the list: thinking or working while its open chat is busy. */
function SidebarAvatar({ bot }: { bot: SidebarBot }) {
  const state = useBotActivity(bot.id);
  return <BotAvatar color={bot.color} seed={bot.id} size={38} state={state} dot={bot.status === "active" ? "green" : bot.status === "paused" ? "amber" : null} />;
}
