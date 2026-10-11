"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBot } from "@/app/(bots)/bots/actions";
import { botsHref } from "@/lib/hosts";

/** sessionStorage key for a first message the new bot's chat sends once it opens. */
export const firstMessageKey = (botId: string) => `pb:first-message:${botId}`;

/**
 * Makes a bot and opens its chat. With a first message the bot skips its
 * hello and the chat sends that message as soon as it opens.
 */
export function useStartBot() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startBot(opts: { name?: string; firstMessage?: string } = {}) {
    setError(null);
    start(async () => {
      let res: { error: string } | { id: string };
      try {
        res = await createBot({ name: opts.name || undefined, greet: !opts.firstMessage });
      } catch {
        // Usually a lapsed sign-in: reloading sends them to sign in again.
        window.location.reload();
        return;
      }
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (opts.firstMessage) {
        try {
          sessionStorage.setItem(firstMessageKey(res.id), opts.firstMessage);
        } catch {
          // Storage blocked: the chat opens without it, and they can send it again.
        }
      }
      router.push(botsHref(`/bots/${res.id}`));
    });
  }

  return { startBot, pending, error };
}
