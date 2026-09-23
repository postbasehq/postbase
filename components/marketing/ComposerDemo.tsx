"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/marketing/AppShell";
import { PostPreview } from "@/components/PostPreview";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { COFFEE, type Example } from "@/components/marketing/examples";

const ALL_CHANNELS = ["x", "linkedin", "instagram", "tiktok", "bluesky"];

/** The real composer, pre-filled with an example post. */
export function ComposerDemo() {
  return (
    <div className="h-[980px] overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.45)] md:h-[700px]">
      <Composer ex={COFFEE} />
    </div>
  );
}

function Composer({ ex }: { ex: Example }) {
  const [body, setBody] = useState(ex.body);
  const [selected, setSelected] = useState<string[]>(ex.channels);
  const [withMedia, setWithMedia] = useState(Boolean(ex.image));
  const [tab, setTab] = useState(ex.channels[0]);

  const active = selected.includes(tab) ? tab : selected[0];
  const thread = useMemo(() => body.split(/\n{2,}/), [body]);
  const media = withMedia && ex.image ? [{ url: ex.image, type: "image/jpeg" }] : [];

  function toggle(p: string) {
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
    setTab(p);
  }

  return (
    <AppShell
      active="/composer"
      title="Composer"
      workspace={{ name: ex.name, sub: `${ex.channels.length} channels` }}
    >
      <div className="grid h-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] md:grid-rows-[minmax(0,1fr)]">
        {/* editor */}
        <div className="flex min-h-0 flex-col overflow-y-auto border-b border-line/70 p-5 md:border-b-0 md:border-r">
          <div className="mb-2 text-[13px] font-semibold text-ink">Channels</div>
          <div className="mb-4 flex flex-wrap gap-2">
            {ALL_CHANNELS.map((p) => {
              const on = selected.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggle(p)}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px] font-medium transition-colors ${
                    on ? "border-blue text-ink" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  <span className={on ? "" : "opacity-40 grayscale"}>
                    <BrandTile platform={p} size={22} radius={11} />
                  </span>
                  {BRANDS[p]?.label}
                </button>
              );
            })}
          </div>

          <div className="flex min-h-[220px] flex-1 flex-col rounded-xl border border-line bg-surface focus-within:border-blue">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              aria-label="Post text"
              className="w-full flex-1 resize-none bg-transparent p-3.5 text-[14px] leading-relaxed text-ink outline-none"
            />
            {withMedia && ex.image ? (
              <div className="px-3.5 pb-3.5">
                <div className="relative w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ex.image} alt="" className="h-16 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setWithMedia(false)}
                    aria-label="Remove image"
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-[11px] leading-none text-surface"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!withMedia && ex.image ? (
              <button
                type="button"
                onClick={() => setWithMedia(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium text-muted hover:text-ink"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-4.5-4.5L5 21" />
                </svg>
                Add media
              </button>
            ) : null}
            <span className="ml-auto text-[12px] tabular-nums text-muted">
              {body.length} characters
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
            <span className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Sun, 6:00 PM
            </span>
            <span className="ml-auto rounded-full bg-blue px-4 py-2 font-display text-[13px] font-semibold text-on-blue shadow-sm">
              Schedule
            </span>
          </div>
        </div>

        {/* live preview */}
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-line/70 px-4 py-2.5">
            {selected.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTab(p)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  active === p ? "bg-ink text-surface" : "text-muted hover:text-ink"
                }`}
              >
                <BrandTile platform={p} size={15} radius={8} />
                {BRANDS[p]?.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {active ? (
              <div key={active} className="swap-in mx-auto max-w-[400px]">
                <PostPreview
                  platform={active}
                  handle={ex.handle}
                  displayName={ex.name}
                  thread={thread}
                  media={media}
                  metrics={null}
                  publishedAt={null}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-muted">
                Pick a channel to see its preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
