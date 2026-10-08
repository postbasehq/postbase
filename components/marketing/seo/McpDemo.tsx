"use client";

import { useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { ClientLogo } from "@/components/ClientLogo";
import { Fit } from "@/components/marketing/Fit";
import { useLoop } from "@/components/marketing/Mocks";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { MCP_LANDING as LANDING, MCP_WHEN as WHEN, type McpScene } from "@/lib/seo/mcp-scenes";

/*
 * The MCP server doing its job: Claude (desktop app, dark) takes a request,
 * calls Postbase's tools, and the post lands on the real Postbase calendar
 * beside it. Same Claude styling as the developers page chat (DevGrid), same
 * calendar as the homepage. The calendar's week is Mon 21 to Sun 27 Sep with
 * Wednesday as today, so "tomorrow at 9" is Thursday 09:00.
 */

const LABEL: Record<string, string> = {
  list_channels: "List channels",
  create_post: "Create or schedule a post",
  list_media: "List media",
};

function ClaudeWindow({ scene, typed, sent, done, running, reply }: {
  scene: McpScene;
  typed: string;
  sent: boolean;
  /** Tool calls finished so far. */
  done: number;
  /** A tool call in progress. */
  running: boolean;
  reply: string;
}) {
  const shown = done + (running ? 1 : 0);
  const cardShown = done === scene.tools.length;
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[18px] bg-[#262624] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] ring-1 ring-black/40">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-[#3a3a37] px-4 py-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#ecebe8]">
          <ClientLogo id="claude" size={16} bare />
          Claude
        </span>
      </div>

      {/* Conversation, pinned to the bottom like a real chat */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3.5 overflow-hidden px-5 pt-5">
        {sent ? (
          <p className="ml-auto max-w-[85%] rounded-2xl bg-[#3a3a37] px-4 py-2.5 text-[14px] leading-snug text-[#ecebe8]">{scene.ask}</p>
        ) : null}

        {shown > 0 ? (
          <div className="flex flex-col gap-2">
            {scene.tools.slice(0, shown).map((t, i) => {
              const live = running && i === shown - 1;
              return (
                <div key={i} className="flex items-center gap-2.5 rounded-xl border border-[#3a3a37] bg-[#1f1f1e] px-3 py-2 text-[13px] text-[#c3c1bb]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/postbase-icon.png" alt="" className="size-[18px] rounded-[5px]" />
                  <span className="font-medium text-[#ecebe8]">{LABEL[t] ?? t}</span>
                  <span className="text-[#7c7a75]">Postbase</span>
                  <span className="ml-auto">
                    {live ? (
                      <span className="block size-2 animate-pulse rounded-full bg-[#d97757]" aria-hidden />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c7a75" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                </div>
              );
            })}
            {cardShown ? (
              <div className="swap-in flex items-center gap-3 rounded-xl bg-[#1f1f1e] px-3 py-2.5 ring-1 ring-[#3a3a37]">
                <span className="flex -space-x-1">
                  {scene.card.chans.map((c) => (
                    <span key={c} className="rounded-[5px] ring-2 ring-[#1f1f1e]">
                      <BrandTile platform={c} size={20} radius={5} />
                    </span>
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[#ecebe8]">{scene.card.what}</span>
                  <span className="block text-[12px] text-[#a8a6a1]">Scheduled · {WHEN}</span>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {sent && !reply && !cardShown ? (
          <span className="w-fit animate-pulse">
            <ClientLogo id="claude" size={22} bare />
          </span>
        ) : null}

        {reply ? (
          <p className="text-[15px] leading-relaxed text-[#ecebe8]" style={{ fontFamily: "ui-serif, Georgia, 'Times New Roman', serif" }}>
            {reply}
          </p>
        ) : null}
      </div>

      {/* Composer, with the Postbase connector switched on */}
      <div className="m-4 rounded-2xl border border-[#3a3a37] bg-[#30302e] px-4 pb-2.5 pt-3">
        <p className={`min-h-[20px] text-[14px] ${typed ? "text-[#ecebe8]" : "text-[#7c7a75]"}`}>
          {typed || "Reply to Claude…"}
          {typed ? <span className="ml-px inline-block h-[15px] w-px translate-y-[2px] animate-pulse bg-[#ecebe8]" /> : null}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg border border-[#3a3a37] text-[16px] leading-none text-[#a8a6a1]" aria-hidden>
            +
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#3a3a37] px-2 py-1 text-[12px] text-[#c3c1bb]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/postbase-icon.png" alt="" className="size-3.5 rounded-[3px]" />
            Postbase
          </span>
          <span
            className={`ml-auto flex size-8 items-center justify-center rounded-lg transition-colors ${typed ? "bg-[#d97757] text-white" : "bg-[#3a3a37] text-[#7c7a75]"}`}
            aria-hidden
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Claude scheduling through Postbase on the left; the post landing on the Postbase calendar on the right. */
export function McpInActionDemo({ scene }: { scene: McpScene }) {
  const [typed, setTyped] = useState("");
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [reply, setReply] = useState("");
  const [landed, setLanded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [ref, motion] = useLoop<HTMLDivElement>(async (step) => {
    setTyped("");
    setSent(false);
    setDone(0);
    setRunning(false);
    setReply("");
    setLanded(false);
    setNotice(null);
    await step(800);
    for (let i = 1; i <= scene.ask.length; i++) {
      setTyped(scene.ask.slice(0, i));
      await step(24);
    }
    await step(400);
    setSent(true);
    setTyped("");
    await step(900);
    for (let i = 0; i < scene.tools.length; i++) {
      setRunning(true);
      await step(scene.tools[i] === "list_channels" ? 800 : 1100);
      setRunning(false);
      setDone(i + 1);
      await step(250);
    }
    setLanded(true);
    setNotice(`Scheduled by Claude · ${WHEN}`);
    await step(500);
    const words = scene.reply.split(" ");
    for (let i = 1; i <= words.length; i++) {
      setReply(words.slice(0, i).join(" "));
      await step(55);
    }
    await step(2200);
    setNotice(null);
    await step(2600);
  });

  // Reduced motion: the finished exchange, still.
  const still = !motion;
  return (
    <div ref={ref}>
      <Fit minWidth={1320} height={600} mobile={{ renderWidth: 1320, viewWidth: 470, x: 0, y: 0, height: 600 }}>
        <div className="flex h-full gap-5">
          <div className="w-[470px] shrink-0">
            <ClaudeWindow
              scene={scene}
              typed={still ? "" : typed}
              sent={still || sent}
              done={still ? scene.tools.length : done}
              running={!still && running}
              reply={still ? scene.reply : reply}
            />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.45)]">
            <CalendarDemo
              sidebar={false}
              incoming={still || landed ? { ...LANDING, chans: scene.card.chans, body: scene.body } : null}
              notice={still ? null : notice}
            />
          </div>
        </div>
      </Fit>
    </div>
  );
}
