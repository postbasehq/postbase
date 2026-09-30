"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import type { PostRow } from "@/lib/analytics/report";
import { dayHref } from "@/lib/analytics/links";

type SortKey = "publishedAt" | "impressions" | "likes" | "comments" | "shares" | "engagement" | "rate";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "impressions", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "engagement", label: "Engagement" },
  { key: "rate", label: "Rate" },
];

const PAGE = 10;

/** Every post published in the range: a tab per network, sortable columns, paged. */
export function PostsTable({ posts, tz }: { posts: PostRow[]; tz: string }) {
  const networks = useMemo(() => [...new Set(posts.flatMap((p) => p.platforms))].sort(), [posts]);
  const [tab, setTab] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "publishedAt", desc: true });
  const [page, setPage] = useState(0);

  // On a network tab, show that network's own numbers for each post.
  const rows = useMemo(() => {
    const list = posts
      .filter((p) => tab === "all" || p.platforms.includes(tab))
      .map((p) => {
        if (tab === "all") return p;
        const b = p.byPlatform.find((x) => x.platform === tab);
        return { ...p, impressions: b?.impressions ?? null, engagement: b?.engagement ?? 0, rate: b?.impressions ? (b.engagement / b.impressions) : null, platforms: [tab] };
      });
    const val = (p: PostRow) => (sort.key === "publishedAt" ? Date.parse(p.publishedAt) : (p[sort.key] ?? -1));
    return list.sort((a, b) => (sort.desc ? val(b) - val(a) : val(a) - val(b)));
  }, [posts, tab, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  // Per-network tabs show only the post's total engagement for that network.
  const detailed = tab === "all";

  const header = (key: SortKey, label: string, align = "text-right") => (
    <th key={key} className={`px-3 py-3 font-medium ${align}`}>
      <button
        type="button"
        onClick={() => {
          setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }));
          setPage(0);
        }}
        className={`inline-flex items-center gap-1 hover:text-ink ${sort.key === key ? "text-ink" : ""}`}
      >
        {label}
        <span aria-hidden className="text-[10px]">{sort.key === key ? (sort.desc ? "▼" : "▲") : "↕"}</span>
      </button>
    </th>
  );

  return (
    <section className="rounded-[22px] border border-line bg-surface p-2 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 pt-2">
        <h2 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-ink">Published posts</h2>
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface-2 p-1">
          {["all", ...networks].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setTab(n);
                setPage(0);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                tab === n ? "bg-ink text-ground" : "text-muted hover:text-ink"
              }`}
            >
              {n !== "all" && BRANDS[n] ? <BrandTile platform={n} size={16} radius={4} /> : null}
              {n === "all" ? "All" : (BRANDS[n]?.label ?? n)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="bg-surface-2 text-[12px] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Post</th>
              {header("publishedAt", "Published", "text-left")}
              {COLUMNS.filter((c) => detailed || ["impressions", "engagement", "rate"].includes(c.key)).map((c) => header(c.key, c.label))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  No posts published in this period.
                </td>
              </tr>
            ) : (
              shown.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="max-w-[340px] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex shrink-0 -space-x-1.5">
                        {p.platforms.slice(0, 4).map((pl) => (
                          <span key={pl} className="rounded-[6px] ring-2 ring-surface">
                            <BrandTile platform={pl} size={20} radius={5} />
                          </span>
                        ))}
                      </span>
                      <Link href={dayHref(p.publishedAt, tz)} className="line-clamp-1 text-ink hover:underline">
                        {p.body || "Untitled post"}
                      </Link>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted">
                    {new Date(p.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz })}
                  </td>
                  <Num v={p.impressions} />
                  {detailed ? (
                    <>
                      <Num v={p.likes} />
                      <Num v={p.comments} />
                      <Num v={p.shares} />
                    </>
                  ) : null}
                  <Num v={p.engagement} strong />
                  <td className="px-3 py-3 text-right tabular-nums text-muted">
                    {p.rate == null ? "—" : `${(p.rate * 100).toFixed(1)}%`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="flex items-center justify-between px-3 pb-1 pt-3 text-[13px] text-muted">
          <span>
            {page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage((x) => x - 1)} className="rounded-full border border-line px-3 py-1.5 font-medium text-ink disabled:opacity-40">
              Previous
            </button>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage((x) => x + 1)} className="rounded-full border border-line px-3 py-1.5 font-medium text-ink disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Num({ v, strong }: { v: number | null; strong?: boolean }) {
  return (
    <td className={`px-3 py-3 text-right tabular-nums ${strong ? "font-semibold text-ink" : "text-ink"}`}>
      {v == null ? <span className="text-muted">—</span> : v.toLocaleString("en-US")}
    </td>
  );
}
