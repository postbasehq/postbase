"use client";

import { useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { useLoop } from "@/components/marketing/Mocks";
import { MCP_LANDING as LANDING, MCP_WHEN as WHEN } from "@/lib/seo/mcp-scenes";

/*
 * The API doing its job: your app's requests arrive one by one, and the post
 * they schedule lands on the real Postbase calendar beside them. The left side
 * is a request log rather than code, and its type is large because this shot
 * is shown small in the Products menu.
 */

const CALLS = [
  { method: "GET", path: "/api/v1/channels", status: 200, result: "3 channels found" },
  { method: "POST", path: "/api/v1/media", status: 201, result: "launch.png uploaded" },
  { method: "POST", path: "/api/v1/posts", status: 201, result: "Scheduled, Thu 09:00", chans: ["x", "linkedin"] },
];

const BODY = "Fieldnote 2.4 is out: offline mode, faster sync and a new export.";

export function ApiShot() {
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [ref, motion] = useLoop<HTMLDivElement>(async (step) => {
    setDone(0);
    setRunning(false);
    setLanded(false);
    setNotice(null);
    await step(700);
    for (let i = 0; i < CALLS.length; i++) {
      setRunning(true);
      await step(800);
      setRunning(false);
      setDone(i + 1);
      await step(350);
    }
    setLanded(true);
    setNotice(`Scheduled by API · ${WHEN}`);
    await step(2400);
    setNotice(null);
    await step(2200);
  });

  // Reduced motion: the finished run, still.
  const still = !motion;
  const finished = still ? CALLS.length : done;
  const shown = finished + (!still && running ? 1 : 0);

  return (
    <div ref={ref} className="flex h-full gap-4 p-4">
      <div className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded-[18px] bg-[#1b1c20] ring-1 ring-black/40">
        <div className="flex items-center gap-3 border-b border-[#33343a] px-5 py-4">
          <span className="flex gap-2" aria-hidden>
            <span className="size-3.5 rounded-full bg-[#ff5f57]" />
            <span className="size-3.5 rounded-full bg-[#febc2e]" />
            <span className="size-3.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="text-[20px] font-semibold text-[#f1f1f3]">Your app</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          {CALLS.slice(0, shown).map((c, i) => {
            const live = i >= finished;
            return (
              <div key={c.path} className="swap-in flex h-[calc((100%-24px)/3)] flex-col justify-center rounded-2xl bg-[#27282e] px-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className="rounded-lg px-2 py-1 text-[16px] font-bold leading-none text-white"
                    style={{ background: c.method === "GET" ? "#2b59d9" : "#d14a3e" }}
                  >
                    {c.method}
                  </span>
                  <code className="min-w-0 flex-1 truncate font-mono text-[20px] font-medium text-[#f1f1f3]">{c.path}</code>
                  {live ? (
                    <span className="size-3 shrink-0 animate-pulse rounded-full bg-[#e3a72c]" aria-hidden />
                  ) : (
                    <span className="shrink-0 rounded-lg bg-[#188038] px-2 py-1 text-[16px] font-bold leading-none text-white">{c.status}</span>
                  )}
                </div>
                {live ? null : (
                  <div className="mt-3 flex items-center gap-2 text-[22px] font-medium text-[#c8c9cf]">
                    {c.chans?.map((n) => <BrandTile key={n} platform={n} size={24} radius={6} />)}
                    <span className="min-w-0 truncate">{c.result}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Laid out wide enough for all seven days, then scaled to the space left. */}
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-[18px] border border-line bg-surface">
        <div className="absolute left-0 top-0 h-[808px] w-[728px] origin-top-left scale-[0.7]">
          <CalendarDemo
            sidebar={false}
            incoming={still || landed ? { ...LANDING, chans: ["x", "linkedin"], body: BODY } : null}
            notice={still ? null : notice}
          />
        </div>
      </div>
    </div>
  );
}
