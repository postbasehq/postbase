"use client";

import { useState } from "react";
import { BrandTile, BRANDS } from "@/components/BrandTile";

export type AnalyticsRow = {
  id: string;
  body: string;
  platform: string;
  metrics: Record<string, number> | null;
};

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

const METRICS: { key: string; label: string }[] = [
  { key: "impressions", label: "Impressions" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
];

const PAGE_SIZE = 12;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const aCols = "grid grid-cols-[minmax(0,1fr)_160px_repeat(5,92px)]";
const txtCell = "flex items-center gap-2 border-r border-line/70 px-3 py-2.5 text-sm";

export function AnalyticsTable({ rows }: { rows: AnalyticsRow[] }) {
  const [page, setPage] = useState(1);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const p = Math.min(page, totalPages);
  const from = (p - 1) * PAGE_SIZE;
  const pageRows = rows.slice(from, from + PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : from + 1;
  const rangeEnd = Math.min(from + PAGE_SIZE, total);

  const pageBtn =
    "rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition-colors";

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h2 className="font-display text-sm font-semibold">Published posts</h2>
        <span className="ml-auto text-xs text-muted">{total}</span>
      </div>

      {total === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">No published posts yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* header */}
              <div className={`${aCols} border-b border-line bg-surface-2/60 text-xs font-semibold text-muted`}>
                <div className={txtCell}>Content</div>
                <div className={txtCell}>Channel</div>
                {METRICS.map((m, i) => (
                  <div
                    key={m.key}
                    className={`flex items-center justify-end px-3 py-2.5 ${i < METRICS.length - 1 ? "border-r border-line/70" : ""}`}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {pageRows.map((row, r) => {
                const label = PLATFORM_LABEL[row.platform] ?? row.platform;
                return (
                  <div
                    key={row.id}
                    className={`${aCols} ${r < pageRows.length - 1 ? "border-b border-line/70" : ""}`}
                  >
                    <div className={txtCell}>
                      <span className="truncate">{row.body || "(no text)"}</span>
                    </div>
                    <div className={txtCell}>
                      {BRANDS[row.platform] ? (
                        <BrandTile platform={row.platform} size={18} radius={5} />
                      ) : null}
                      <span className="truncate text-[13px] font-medium">{label}</span>
                    </div>
                    {METRICS.map((m, i) => {
                      const v = row.metrics?.[m.key];
                      const last = i === METRICS.length - 1;
                      return (
                        <div
                          key={m.key}
                          className={`flex items-center justify-end px-3 py-2.5 text-sm tabular-nums ${last ? "" : "border-r border-line/70"}`}
                        >
                          {typeof v === "number" ? (
                            <span className="font-semibold">{fmt(v)}</span>
                          ) : (
                            <span className="text-muted">{row.metrics ? "—" : "·"}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-xs text-muted">
              <span>
                Page {p} of {totalPages} · {rangeStart}–{rangeEnd} of {total}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p - 1)}
                  disabled={p <= 1}
                  className={`${pageBtn} ${p <= 1 ? "text-muted/40" : "text-ink hover:bg-surface-2"}`}
                >
                  ‹ Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p + 1)}
                  disabled={p >= totalPages}
                  className={`${pageBtn} ${p >= totalPages ? "text-muted/40" : "text-ink hover:bg-surface-2"}`}
                >
                  Next ›
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
