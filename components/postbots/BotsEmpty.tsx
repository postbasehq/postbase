"use client";

import Link from "next/link";
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

const PLAN_JOBS: { color: BotColor; text: string }[] = [
  { color: "blue", text: "Listen for your name on Reddit, Hacker News and Bluesky" },
  { color: "amber", text: "Find people asking for what you make" },
  { color: "red", text: "Draft posts for your channels, ready to schedule" },
];

/** Postbots need a plan: what they do, and the way to one. */
export function PlanGate() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
      <div className="w-full max-w-lg">
        <Heading title="Postbots come with every Postbase plan" sub="Bots you build by chatting. They listen, research and draft for you on a schedule." />
        <ul className="mt-8 flex flex-col gap-1.5">
          {PLAN_JOBS.map((j) => (
            <li key={j.text} className={row}>
              <BotAvatar color={j.color} size={26} />
              <span className="min-w-0 flex-1">{j.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-center">
          <Link
            href="/billing"
            className="rounded-full bg-blue px-6 py-3 font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
          >
            See plans
          </Link>
        </div>
      </div>
    </div>
  );
}
