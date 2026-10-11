"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BotAvatar } from "@/components/postbots/BotAvatar";
import { HeroPostbots } from "@/components/marketing/Decor";
import { useStartBot } from "@/components/postbots/useStartBot";
import { botsHref } from "@/lib/hosts";
import { SITE_URL } from "@/lib/site";
import type { BotColor } from "@/lib/postbots/types";

/** Jobs a new bot can start on: they send as its first message. */
export const STARTERS: { color: BotColor; text: string }[] = [
  { color: "blue", text: "Find people on Reddit asking for what I make" },
  { color: "amber", text: "Draft this week's posts for my channels" },
  { color: "red", text: "Tell me what's worth posting about in my industry this week" },
];

/** Three Postbots in the brand colours, the tall one in the middle upside
 *  down, each up to something different: red thinking, blue watching the
 *  cursor, amber at work. */
function BotTrio() {
  return (
    <div className="flex items-end justify-center gap-4" aria-hidden>
      <BotAvatar color="red" size={76} state="thinking" />
      <BotAvatar inverted color="blue" size={108} follow />
      <BotAvatar color="amber" size={76} state="working" />
    </div>
  );
}

/**
 * A headline and a line under it (with the bots on the plan page). `page` sets it at page scale (the
 * plan gate, a page of its own, like /pricing); otherwise it sits in a panel.
 */
function Heading({ title, sub, page = false }: { title: string; sub: string; page?: boolean }) {
  return (
    <div className="text-center">
      {/* Only the plan page has the bots (and on wide screens they hang from its edges instead). */}
      {page ? (
        <div className="xl:hidden">
          <BotTrio />
        </div>
      ) : null}
      {page ? (
        <>
          <h1 className="mx-auto mt-8 max-w-[18ch] xl:mt-0 text-balance font-display text-[clamp(40px,5.6vw,68px)] font-semibold leading-[1.04] tracking-[-0.04em] text-ink">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-balance text-[17px] leading-relaxed text-muted md:text-[19px]">{sub}</p>
        </>
      ) : (
        <>
          <h1 className="text-balance font-display text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink md:text-[34px]">
            {title}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-balance text-[15px] leading-relaxed text-muted">{sub}</p>
        </>
      )}
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
          {STARTERS.map((s, i) => (
            <button
              key={s.text}
              type="button"
              disabled={pending}
              onClick={() => startBot({ firstMessage: s.text })}
              className={`${row} transition hover:bg-line disabled:opacity-60`}
            >
              <BotAvatar color={s.color} inverted={i % 2 === 1} size={26} />
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
        <div className="w-full max-w-4xl">
          <Heading page title="You're subscribed" sub="Getting your bots ready. This page opens them in a moment." />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* The homepage's Postbots, hanging from the top and sides (wide screens). */}
      <HeroPostbots linked={false} />
      <div className="relative z-20 flex shrink-0 justify-end px-5 pt-4 md:px-8 md:pt-5">
        {/* Bots-host aware: /calendar there goes to the app. */}
        <Link href="/calendar" className="rounded-full px-3 py-1.5 text-[14px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink">
          Back to Postbase
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center px-4 pb-16 pt-6 md:px-8 md:pt-10 xl:pt-20">
        <div className="w-full max-w-4xl">
          <Heading
            page
            title="Postbots come with every Postbase plan"
            sub="Bots you build by chatting. They listen for you, find people asking for what you make, and draft posts, on a schedule."
          />
        </div>
        {cards ? (
          <>
            <div className="mt-12 w-full max-w-[1320px]">{cards}</div>
            <p className="mt-8 text-center text-[14px] text-muted">
              Every plan includes Postbots, the scheduler and the AI agent.{" "}
              <a href={`${SITE_URL}/pricing`} className="font-medium text-ink underline underline-offset-2 hover:text-blue-ink">
                Compare plans
              </a>
            </p>
          </>
        ) : (
          <p className="mt-8 max-w-md text-balance text-center text-[15px] text-muted">
            Ask an owner or admin of this workspace to pick a plan, and your bots will be ready.
          </p>
        )}
      </div>
    </div>
  );
}
