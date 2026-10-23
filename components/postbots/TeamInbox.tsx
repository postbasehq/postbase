"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BotAvatar } from "@/components/postbots/BotAvatar";
import { DraftView, FindingsView, type BotChannel } from "@/components/postbots/BotChat";
import { firstMessageKey } from "@/components/postbots/useStartBot";
import { closeInboxItem } from "@/app/(bots)/bots/actions";
import { botsHref } from "@/lib/hosts";
import type { BotColor, DraftCard, FindingsCard } from "@/lib/postbots/types";

export type InboxItem = {
  id: string;
  messageId: string;
  cardIndex: number;
  createdAt: string;
  /** The bot's note with the card (what it did, or why it's showing this). */
  text: string;
  card: DraftCard | FindingsCard;
  bot: { id: string; name: string; color: BotColor };
};

/** "Just now", "25 min ago", "3 h ago", "Mon 09:05". */
function ago(iso: string, now: number): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * The team inbox: what every bot prepared, newest first. Drafts are edited and
 * saved or scheduled right here; findings link out, or hand a reply to the bot
 * that found them. Saving, acting or dismissing clears an item.
 */
export function TeamInbox({ items: initial, channels }: { items: InboxItem[]; channels: BotChannel[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  // Times are in the viewer's timezone, which the server can't know.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const close = (id: string, status: "done" | "dismissed") => {
    setItems((list) => list.filter((i) => i.id !== id));
    void closeInboxItem(id, status).catch(() => undefined);
  };

  // A finding's "Draft a reply" goes to the bot that found it, which starts on it.
  const handOff = (item: InboxItem, text: string) => {
    try {
      sessionStorage.setItem(firstMessageKey(item.bot.id), text);
    } catch {
      // Storage blocked: the chat opens, and they can ask again there.
    }
    close(item.id, "done");
    router.push(botsHref(`/bots/${item.bot.id}`));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 pl-14 pr-3 md:px-6">
        <h1 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">Inbox</h1>
        {items.length ? <span className="text-[13px] text-muted">{items.length} waiting</span> : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-10 pt-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center pt-[14vh] text-center">
              <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">Nothing waiting</h2>
              <p className="mt-2 max-w-md text-balance text-[15px] leading-relaxed text-muted">
                When your bots draft posts or find something worth a look, it lands here, from their chats, their checks and their routines.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <section key={item.id} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <BotAvatar color={item.bot.color} seed={item.bot.id} size={28} />
                  <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{item.bot.name}</span>
                  <span className="shrink-0 text-[13px] text-muted">{now ? ago(item.createdAt, now) : null}</span>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    <Link
                      href={botsHref(`/bots/${item.bot.id}`)}
                      className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
                    >
                      Open chat
                    </Link>
                    <button
                      type="button"
                      onClick={() => close(item.id, "dismissed")}
                      aria-label="Dismiss"
                      title="Dismiss"
                      className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                </div>
                {item.text ? <p className="line-clamp-3 text-[14px] leading-relaxed text-muted">{item.text}</p> : null}
                {item.card.type === "draft" ? (
                  <DraftView
                    card={item.card}
                    botId={item.bot.id}
                    channels={channels}
                    from={{ messageId: item.messageId, cardIndex: item.cardIndex }}
                  />
                ) : (
                  <FindingsView card={item.card} busy={false} onSend={(text) => handOff(item, text)} />
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
