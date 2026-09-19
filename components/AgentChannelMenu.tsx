"use client";

import { BrandTile } from "@/components/BrandTile";
import type { AgentChannel } from "@/components/AgentChat";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

/**
 * The @-mention channel picker that drops up above the composer. Filters the
 * user's connected channels by handle/platform as they type after the "@" and
 * hands the picked channel back to the chat as a target.
 */
export function AgentChannelMenu({
  channels,
  query,
  onPick,
  onClose,
}: {
  channels: AgentChannel[];
  query: string;
  onPick: (channel: AgentChannel) => void;
  onClose: () => void;
}) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? channels.filter(
        (c) =>
          (c.handle ?? "").toLowerCase().includes(q) || c.platform.toLowerCase().includes(q),
      )
    : channels;

  return (
    <div className="flex max-h-72 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-muted">
          {q ? `Channels matching “${query.trim()}”` : "Mention a channel"}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-[12px] text-muted">
            {channels.length === 0 ? "No connected channels." : "No matching channels."}
          </p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onPick(c);
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface-2"
            >
              <BrandTile platform={c.platform} size={22} radius={6} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                {c.handle ? `@${c.handle.replace(/^@/, "")}` : c.platform}
              </span>
              <span className="shrink-0 text-[11px] text-muted">
                {PLATFORM_LABEL[c.platform] ?? c.platform}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
