import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone, formatInTz } from "@/lib/tz";
import { BrandTile } from "@/components/BrandTile";
import { DeletePostButton } from "@/components/DeletePostButton";
import { deletePost } from "../actions";

type Row = {
  id: string;
  body: string;
  thread_tail: string[] | null;
  updated_at: string | null;
  post_targets: { channels: { platform: string } | null }[] | null;
};

const COLS = "grid grid-cols-[140px_minmax(0,1fr)_96px_112px]";
const cell = "flex items-center border-r border-line/70 px-3 py-2";
const PAGE_SIZE = 10;

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const tz = await getTimeZone();
  const whenLabel = (iso: string | null) =>
    iso
      ? formatInTz(iso, tz, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : "—";

  const { page: pageParam, q: qParam } = await searchParams;
  const q = (qParam ?? "").trim();
  const requested = Math.max(1, Number(pageParam) || 1);
  const from = (requested - 1) * PAGE_SIZE;

  let query = supabase
    .from("posts")
    .select("id, body, thread_tail, updated_at, post_targets(channels(platform))", { count: "exact" })
    .eq("status", "draft")
    .order("updated_at", { ascending: false });
  if (q) query = query.ilike("body", `%${q}%`);
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, totalPages);
  const rangeStart = total === 0 ? 0 : from + 1;
  const rangeEnd = from + rows.length;

  const pageHref = (pg: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pg > 1) params.set("page", String(pg));
    const s = params.toString();
    return `/drafts${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-blue sm:w-64">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search drafts…"
            aria-label="Search drafts"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted"
          />
          {q ? (
            <Link href="/drafts" aria-label="Clear search" className="shrink-0 text-muted hover:text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Link>
          ) : null}
        </form>
        <Link
          href="/composer"
          className="ml-auto rounded-full bg-blue px-4 py-2 font-display text-sm font-semibold text-on-blue shadow-sm"
        >
          New draft
        </Link>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-muted">{q ? `No drafts match “${q}”.` : "No drafts yet."}</p>
            <Link
              href={q ? "/drafts" : "/composer"}
              className="mt-3 inline-block rounded-full border border-line px-4 py-2 text-sm font-medium text-blue-ink hover:bg-surface-2"
            >
              {q ? "Clear search" : "Start a draft"}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              {/* column header */}
              <div
                className={`${COLS} border-b border-line bg-surface-2/60 text-xs font-semibold text-muted`}
              >
                <div className={`${cell} py-2.5`}>Updated</div>
                <div className={`${cell} py-2.5`}>Content</div>
                <div className={`${cell} py-2.5`}>Channels</div>
                <div className="flex items-center justify-center px-3 py-2.5">Actions</div>
              </div>

              {rows.map((p) => {
                const platforms = Array.from(
                  new Set((p.post_targets ?? []).map((t) => t.channels?.platform).filter(Boolean)),
                ) as string[];
                const threadLen = p.thread_tail?.length ?? 0;
                return (
                  <div key={p.id} className="border-b border-line last:border-b-0">
                    <div className={`${COLS} text-sm transition-colors hover:bg-surface-2/30`}>
                      <div className={`${cell} whitespace-nowrap font-display text-[13px] font-semibold tabular-nums text-muted`}>
                        {whenLabel(p.updated_at)}
                      </div>

                      <Link href={`/composer/${p.id}`} className={`${cell} group min-w-0`}>
                        <span className="truncate group-hover:text-blue-ink">
                          {threadLen > 0 ? (
                            <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                              🧵 {threadLen + 1}
                            </span>
                          ) : null}
                          {p.body || <span className="text-muted">(empty draft)</span>}
                        </span>
                      </Link>

                      <div className={cell}>
                        {platforms.length > 0 ? (
                          <div className="flex -space-x-1.5">
                            {platforms.slice(0, 3).map((pl) => (
                              <span key={pl} className="rounded-[6px] bg-surface p-[1.5px] shadow-sm ring-1 ring-line">
                                <BrandTile platform={pl} size={19} radius={5} />
                              </span>
                            ))}
                            {platforms.length > 3 ? (
                              <span className="flex size-[22px] items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted ring-1 ring-line">
                                +{platforms.length - 3}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 px-2 py-2">
                        <Link
                          href={`/composer/${p.id}`}
                          className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-center text-xs font-semibold text-ink transition-colors hover:border-blue hover:bg-surface-2"
                        >
                          Edit
                        </Link>
                        <span className="ml-auto shrink-0">
                          <DeletePostButton action={deletePost} postId={p.id} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rows.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-xs text-muted tabular-nums">
              {totalPages > 1 ? `Page ${page} of ${totalPages} · ` : ""}
              {rangeStart}–{rangeEnd} of {total} draft{total === 1 ? "" : "s"}
            </span>
            {totalPages > 1 ? (
              <div className="flex items-center gap-1.5">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2">
                    ‹ Previous
                  </Link>
                ) : (
                  <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted opacity-50">
                    ‹ Previous
                  </span>
                )}
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2">
                    Next ›
                  </Link>
                ) : (
                  <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted opacity-50">
                    Next ›
                  </span>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
