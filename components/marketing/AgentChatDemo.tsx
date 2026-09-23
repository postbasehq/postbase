"use client";

import { useEffect, useState } from "react";
import { PostPreview } from "@/components/PostPreview";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { CERAMICS, COFFEE, FIELDNOTE, type Example } from "@/components/marketing/examples";

type Tool = { name: string; detail: string };
type Scenario = {
  chip: string;
  prompt: string;
  tools: Tool[];
  reply: string;
  when: string;
  /** First channel is the one previewed. */
  channels: string[];
  post: Example;
};

const SCENARIOS: Scenario[] = [
  {
    chip: "Changelog → launch post",
    prompt: "Turn today's changelog into a launch post for X and LinkedIn. Schedule it for tomorrow at 9am.",
    tools: [
      { name: "list_channels", detail: "Found X and LinkedIn" },
      { name: "create_post", detail: "2 channels · Thu 9:00 AM" },
    ],
    reply: "Scheduled for Thursday at 9:00 AM on X and LinkedIn. It's in your calendar if you want to change the wording.",
    when: "Thu 9:00 AM",
    channels: ["x", "linkedin"],
    post: FIELDNOTE,
  },
  {
    chip: "Queue a product drop",
    prompt: "Queue the Kochere post for Wednesday at noon on Instagram, X and LinkedIn.",
    tools: [
      { name: "list_channels", detail: "Found Instagram, X and LinkedIn" },
      { name: "create_post", detail: "3 channels · Wed 12:00 PM" },
    ],
    reply: "Done. Kochere goes out Wednesday at 12:00 PM on all three, with the photo attached.",
    when: "Wed 12:00 PM",
    channels: ["instagram", "x", "linkedin"],
    post: COFFEE,
  },
  {
    chip: "Move a scheduled post",
    prompt: "What's going out this weekend? Push the cup drop back to 7pm.",
    tools: [
      { name: "list_scheduled", detail: "3 posts this weekend" },
      { name: "cancel_post", detail: "Shop opens: 24 cups · Sun 6:00 PM" },
      { name: "create_post", detail: "3 channels · Sun 7:00 PM" },
    ],
    reply: "Three posts this weekend. I moved the cup drop from 6:00 PM to 7:00 PM on Sunday. The other two are unchanged.",
    when: "Sun 7:00 PM",
    channels: ["bluesky", "x", "mastodon"],
    post: { ...CERAMICS, body: CERAMICS.body.replace("6pm", "7pm") },
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A scripted agent session: the prompt, the Postbase tool calls it makes, and the post it lands. */
export function AgentChatDemo() {
  const [active, setActive] = useState(0);
  const [chars, setChars] = useState(0);
  const [toolsDone, setToolsDone] = useState(-1); // index of last finished tool; -1 = none started
  const [phase, setPhase] = useState<"typing" | "tools" | "done">("typing");

  const s = SCENARIOS[active];

  useEffect(() => {
    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (async () => {
      setPhase("typing");
      setToolsDone(-1);
      if (reduced) {
        setChars(s.prompt.length);
        setToolsDone(s.tools.length - 1);
        setPhase("done");
        return;
      }
      setChars(0);
      for (let i = 1; i <= s.prompt.length; i++) {
        if (cancelled) return;
        setChars(i);
        await sleep(18);
      }
      await sleep(350);
      if (cancelled) return;
      setPhase("tools");
      for (let t = 0; t < s.tools.length; t++) {
        await sleep(750);
        if (cancelled) return;
        setToolsDone(t);
      }
      await sleep(400);
      if (cancelled) return;
      setPhase("done");
      await sleep(6000);
      if (cancelled) return;
      setActive((a) => (a + 1) % SCENARIOS.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, s]);

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.45)]">
      <div className="grid md:h-[600px] md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:grid-rows-[minmax(0,1fr)]">
        {/* conversation */}
        <div className="flex min-h-[420px] md:min-h-0 flex-col border-b border-line md:border-b-0 md:border-r">
          <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
            <span className="font-display text-[14px] font-semibold text-ink">Your agent</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
              <span className="size-1.5 rounded-full bg-green" />
              Postbase connected
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="max-w-[88%] self-end rounded-2xl rounded-br-md bg-blue px-4 py-2.5 text-[14px] leading-relaxed text-on-blue">
              {s.prompt.slice(0, chars)}
              {phase === "typing" ? <span className="ml-0.5 animate-pulse">▍</span> : null}
            </div>

            {phase !== "typing" ? (
              <div className="flex flex-col gap-1.5">
                {s.tools.map((t, i) => {
                  const done = i <= toolsDone;
                  const running = i === toolsDone + 1 && phase === "tools";
                  if (!done && !running) return null;
                  return (
                    <div
                      key={t.name + i}
                      className="swap-in flex items-center gap-3 rounded-xl border border-line px-3 py-2"
                    >
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          done ? "bg-green text-surface" : "border-2 border-line border-t-blue animate-spin"
                        }`}
                        aria-hidden
                      >
                        {done ? "✓" : ""}
                      </span>
                      <code className="font-mono text-[12.5px] font-medium text-ink">{t.name}</code>
                      <span className="ml-auto truncate text-[12px] text-muted">{done ? t.detail : "Running…"}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {phase === "done" ? (
              <p className="swap-in max-w-[92%] text-[14px] leading-relaxed text-ink">{s.reply}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-3">
            {SCENARIOS.map((sc, i) => (
              <button
                key={sc.chip}
                type="button"
                onClick={() => setActive(i)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
                  i === active ? "bg-ink text-surface" : "border border-line text-muted hover:text-ink"
                }`}
              >
                {sc.chip}
              </button>
            ))}
          </div>
        </div>

        {/* what landed in Postbase */}
        <div className="flex min-h-[420px] md:min-h-0 flex-col bg-ground">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/postbase-icon.png" alt="" className="size-5 rounded-[5px]" />
            <span className="font-display text-[14px] font-semibold text-ink">In Postbase</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {phase === "done" ? (
              <div key={active} className="swap-in">
                <div className="mb-3 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-blue" />
                  <span className="text-[12.5px] font-semibold text-ink">Scheduled</span>
                  <span className="text-[12.5px] text-muted">· {s.when}</span>
                  <span className="ml-auto flex -space-x-1">
                    {s.channels.map((c) => (
                      <span key={c} className="rounded-full ring-2 ring-ground" title={BRANDS[c]?.label}>
                        <BrandTile platform={c} size={18} radius={9} />
                      </span>
                    ))}
                  </span>
                </div>
                <PostPreview
                  platform={s.channels[0]}
                  handle={s.post.handle}
                  displayName={s.post.name}
                  thread={s.post.body.split(/\n{2,}/)}
                  media={s.post.image ? [{ url: s.post.image, type: "image/jpeg" }] : []}
                  metrics={null}
                  publishedAt={null}
                />
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center">
                <div className="h-2 w-24 animate-pulse rounded-full bg-line" />
                <div className="h-2 w-16 animate-pulse rounded-full bg-line" />
                <p className="mt-2 text-[12.5px] text-muted">The post appears here when your agent schedules it.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
