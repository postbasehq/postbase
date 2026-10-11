"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BotAvatar } from "@/components/postbots/BotAvatar";
import { useStartBot } from "@/components/postbots/useStartBot";
import { botsHref } from "@/lib/hosts";
import type { BotColor } from "@/lib/postbots/types";

/** Jobs a new bot can start on: they send as its first message. */
export const STARTERS: { color: BotColor; text: string }[] = [
  { color: "blue", text: "Find people on Reddit asking for what I make" },
  { color: "amber", text: "Draft this week's posts for my channels" },
  { color: "red", text: "Tell me what's worth posting about in my industry this week" },
];

/** Three Postbots in the brand colours, each up to something different:
 *  red thinking, blue watching the cursor, amber at work. */
function BotTrio() {
  return (
    <div className="flex items-end justify-center gap-3" aria-hidden>
      <BotAvatar color="red" size={60} state="thinking" />
      <span className="-mb-1">
        <BotAvatar color="blue" size={84} follow />
      </span>
      <BotAvatar color="amber" size={60} state="working" />
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center">
      <BotTrio />
      <h1 className="mt-6 text-balance font-display text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink md:text-[34px]">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-balance text-[15px] leading-relaxed text-muted">{sub}</p>
    </div>
  );
}

/** A row in the same style as the bots' question answers. */
const row = "flex w-full items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 text-left text-[15px] font-medium text-ink";

/** No bots yet: pick a first job, or start from scratch. */
export function FirstBot() {
  const { startBot, pending, error } = useStartBot();
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
      <div className="w-full max-w-lg">
        <Heading title="Make your first bot" sub="Give it a job. It sets itself up, gets on with it, and messages you when there's something to look at." />
        <div className="mt-8 flex flex-col gap-1.5">
          {STARTERS.map((s) => (
            <button
              key={s.text}
              type="button"
              disabled={pending}
              onClick={() => startBot({ firstMessage: s.text })}
              className={`${row} transition hover:bg-line disabled:opacity-60`}
            >
              <BotAvatar color={s.color} size={26} />
              <span className="min-w-0 flex-1">{s.text}</span>
            </button>
          ))}
          <Link href={botsHref("/bots/new")} className={`${row} transition hover:bg-line`}>
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-surface text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">Start from scratch</span>
          </Link>
        </div>
        {error ? <p className="mt-3 text-center text-sm" style={{ color: "#d14a3e" }}>{error}</p> : null}
      </div>
    </div>
  );
}

/**
 * Postbots need a plan: the bots, the headline, and the plan cards to pick
 * one right here (`cards`, from the layout), or a note for members who can't
 * buy for the workspace.
 */
export function PlanGate({ cards }: { cards: React.ReactNode | null }) {
  const router = useRouter();
  // Back from checkout: Stripe's notice that the plan is live can take a few
  // seconds, so say so and check again until the bots open (about a minute at most).
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("checkout") !== "success") return;
    setPaid(true);
    let tries = 0;
    const t = setInterval(() => {
      if (++tries > 30) return clearInterval(t);
      router.refresh();
    }, 2000);
    return () => clearInterval(t);
  }, [router]);

  if (paid) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <Heading title="You're subscribed" sub="Getting your bots ready. This page opens them in a moment." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-12 md:py-16">
      <div className="w-full max-w-lg">
        <Heading title="Postbots come with every Postbase plan" sub="Bots you build by chatting. They listen, research and draft for you on a schedule." />
      </div>
      {cards ? (
        <div className="mt-10 w-full max-w-[1180px]">{cards}</div>
      ) : (
        <p className="mt-8 max-w-md text-balance text-center text-[15px] text-muted">
          Ask an owner or admin of this workspace to pick a plan, and your bots will be ready.
        </p>
      )}
    </div>
  );
}
