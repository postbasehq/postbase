"use client";

import { useEffect, useState } from "react";
import { BotAvatar } from "@/components/postbots/BotAvatar";
import { BrandTile } from "@/components/BrandTile";
import type { BotColor } from "@/lib/postbots/types";

/*
 * A faithful copy of the Postbots app (components/postbots/BotChat.tsx and
 * BotsSidebar.tsx) for marketing: the bot list on the left, one chat on the
 * right. It loops a short exchange: you ask, the bot searches (working face),
 * and its findings land as a card.
 */

const BOTS: { name: string; color: BotColor; preview: string; dot?: "green" | "amber" }[] = [
  { name: "Mentions Bot", color: "blue", preview: "3 new things worth a look", dot: "green" },
  { name: "Leads Bot", color: "red", preview: "Someone on Reddit is asking for…", dot: "green" },
  { name: "Competitor Bot", color: "amber", preview: "Here's what Buffer shipped this week" },
];

const FINDINGS = [
  { source: "reddit", title: "Looking for a Buffer alternative with an API", meta: "Reddit · r/SaaS · Possible lead" },
  { source: "hackernews", title: "Show HN: scheduling posts from Claude", meta: "Hacker News · 48 comments" },
  { source: "bluesky", title: "Anyone tried an open-source scheduler?", meta: "Bluesky · @maya.design" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PostbotsShot() {
  // 0 asked · 1 searching · 2 summary · 3+ findings appear one by one
  const [step, setStep] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      while (alive) {
        setStep(0);
        await sleep(900);
        if (!alive) return;
        setStep(1);
        await sleep(1800);
        for (let s = 2; s <= 5 && alive; s++) {
          setStep(s);
          await sleep(s === 2 ? 700 : 450);
        }
        await sleep(3600);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-line bg-ground">
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-line">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="flex-1 font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">Postbots</span>
          <span className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </div>
        <div className="px-2">
          {BOTS.map((b, i) => (
            <div key={b.name} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${i === 0 ? "bg-surface-2" : ""}`}>
              <BotAvatar color={b.color} size={42} dot={b.dot} state={i === 0 && step === 1 ? "working" : "resting"} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">{b.name}</span>
                <span className="block truncate text-[13px] text-muted">{b.preview}</span>
              </span>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-center">
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2 pr-4 shadow-sm">
            <BotAvatar color="blue" size={28} state={step === 1 ? "working" : step === 0 ? "thinking" : "resting"} />
            <span className="font-display text-[15px] font-semibold text-ink">Mentions Bot</span>
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 px-8 pt-2">
          <div className="flex justify-end">
            <p className="max-w-[75%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed text-white" style={{ background: "#2b59d9" }}>
              Anything new about us today?
            </p>
          </div>
          {step === 1 ? (
            <div className="flex items-center gap-2 px-1 py-1">
              <BotAvatar color="blue" size={26} state="working" />
              <span className="agent-shimmer text-[13px] font-medium">Mentions Bot is checking its sources</span>
            </div>
          ) : null}
          {step >= 2 ? (
            <div className="flex max-w-[80%] flex-col gap-2">
              <p className="rounded-3xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed text-ink">
                Three things worth your time. Someone on Reddit is asking for exactly what you make.
              </p>
              <div className="rounded-3xl bg-surface-2 p-4">
                <ul className="flex flex-col gap-3">
                  {FINDINGS.map((f, i) =>
                    step >= 3 + i ? (
                      <li key={f.title} className="pb-pop flex gap-3">
                        <span className="pt-0.5">
                          <BrandTile platform={f.source} size={26} radius={7} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium text-ink">{f.title}</span>
                          <span className="block text-[13px] text-muted">{f.meta}</span>
                        </span>
                        {i === 0 ? (
                          <span className="self-center rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink">
                            Draft a reply
                          </span>
                        ) : null}
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
