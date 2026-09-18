"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/marketing/AppShell";
import { PostPreview } from "@/components/PostPreview";
import { BrandTile, BRANDS } from "@/components/BrandTile";

type Channel = { platform: string; handle: string; name: string };

const CHANNELS: Channel[] = [
  { platform: "x", handle: "postbasehq", name: "Postbase" },
  { platform: "linkedin", handle: "postbase", name: "Postbase" },
  { platform: "instagram", handle: "postbase", name: "Postbase" },
  { platform: "tiktok", handle: "postbase", name: "Postbase" },
  { platform: "bluesky", handle: "postbase.so", name: "Postbase" },
];

const SAMPLE =
  "We just shipped scheduled threads ⚡️\n\nWrite once, pick your channels, set a time — Postbase publishes it for you and shows the status of every post in plain sight.\n\nOpen-source. MCP-native. Yours to run.";

const POSTER = { url: "/demo/poster-landscape.svg", type: "image/svg+xml" };

export function ComposerDemo() {
  const [body, setBody] = useState(SAMPLE);
  const [selected, setSelected] = useState<string[]>(["x", "linkedin", "instagram"]);
  const [withMedia, setWithMedia] = useState(true);
  const [tab, setTab] = useState("x");

  const active = selected.includes(tab) ? tab : selected[0] ?? "x";
  const chan = CHANNELS.find((c) => c.platform === active)!;
  const thread = useMemo(() => body.split(/\n{2,}/), [body]);
  const media = withMedia ? [POSTER] : [];
  const count = body.length;

  function toggle(p: string) {
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  }

  return (
    <AppShell active="/composer" title="Composer">
      <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        {/* ── editor ─────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col overflow-y-auto border-b border-line/70 p-5 md:border-b-0 md:border-r">
          <div className="mb-3">
            <div className="mb-2 text-[13px] font-semibold text-ink">Channels</div>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => {
                const on = selected.includes(c.platform);
                return (
                  <button
                    key={c.platform}
                    type="button"
                    onClick={() => {
                      toggle(c.platform);
                      setTab(c.platform);
                    }}
                    className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-[13px] font-medium transition ${
                      on
                        ? "border-blue/40 bg-blue-soft text-blue-ink"
                        : "border-line bg-surface text-muted hover:text-ink"
                    }`}
                  >
                    <span className={on ? "" : "opacity-45 grayscale"}>
                      <BrandTile platform={c.platform} size={22} radius={7} />
                    </span>
                    {BRANDS[c.platform]?.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* author */}
          <div className="mb-2 flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-terra font-display text-[13px] font-semibold text-white">
              S
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-ink">Posting as Postbase</div>
              <div className="text-[11.5px] text-muted">
                {selected.length} {selected.length === 1 ? "channel" : "channels"} selected
              </div>
            </div>
          </div>

          {/* textarea */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            rows={7}
            className="w-full flex-1 resize-none rounded-xl border border-line bg-surface p-3.5 text-[14px] leading-relaxed text-ink outline-none focus:border-blue/50"
            placeholder="Write your post…"
          />

          {/* toolbar */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWithMedia((m) => !m)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
                withMedia
                  ? "border-blue/40 bg-blue-soft text-blue-ink"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-4.5-4.5L5 21" />
              </svg>
              {withMedia ? "Media attached" : "Add media"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-blue/40 bg-blue-soft px-3 py-1.5 text-[13px] font-semibold text-blue-ink"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
              </svg>
              Generate
            </button>
            <span className="ml-auto text-[12px] tabular-nums text-muted">{count}</span>
          </div>

          {/* schedule + publish */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Tue, 9:00 AM
            </span>
            <span className="text-[12px] text-muted">Europe/London</span>
            <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-blue px-4 py-2 font-display text-[13px] font-semibold text-on-blue shadow-sm">
              Schedule
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m5 12 14 0M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
        </div>

        {/* ── live preview ───────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col bg-surface-2/40">
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line/70 px-4 py-2.5">
            <span className="mr-1 text-[12px] font-medium text-muted">Preview</span>
            {selected.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTab(p)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
                  active === p ? "bg-ink text-surface" : "text-muted hover:text-ink"
                }`}
              >
                <BrandTile platform={p} size={15} radius={5} />
                {BRANDS[p]?.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {chan ? (
              <div className="mx-auto max-w-[420px]">
                <PostPreview
                  platform={chan.platform}
                  handle={chan.handle}
                  displayName={chan.name}
                  thread={thread}
                  media={media}
                  metrics={null}
                  publishedAt={null}
                  verified
                />
                <p className="mt-3 text-center text-[12px] text-muted">
                  Live preview · exactly how it renders on {BRANDS[chan.platform]?.label}
                </p>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-muted">
                Pick a channel to preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
