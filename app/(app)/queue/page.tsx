import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone, formatInTz } from "@/lib/tz";
import { SubmitButton } from "@/components/SubmitButton";
import { BrandTile } from "@/components/BrandTile";
import { QueueControls } from "@/components/QueueControls";
import { DeletePostButton } from "@/components/DeletePostButton";
import { PostStatsButton } from "@/components/PostStatsButton";
import { cancelPost, retryTarget, deletePost } from "../actions";

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold font-display whitespace-nowrap";

const STATUS: Record<string, { cls: string; dot: string; label: string }> = {
  draft: { cls: "bg-surface-2 text-muted", dot: "bg-muted", label: "Draft" },
  scheduled: { cls: "bg-blue-soft text-blue-ink", dot: "bg-blue", label: "Scheduled" },
  publishing: { cls: "bg-amber-bright/15 text-amber", dot: "bg-amber-bright", label: "Publishing" },
  published: { cls: "bg-green/15 text-green", dot: "bg-green", label: "Published" },
  failed: { cls: "bg-[#d14a3e] text-white", dot: "bg-white", label: "Failed" },
};

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

type TargetRow = {
  id: string;
  status: string;
  error: string | null;
  attempts: number;
  next_attempt_at: string | null;
  platform_post_id: string | null;
  metrics: Record<string, number> | null;
  metrics_updated_at: string | null;
  channels: { platform: string; handle: string | null } | null;
};
type PostRow = {
  id: string;
  body: string;
  thread_tail: string[] | null;
  scheduled_at: string | null;
  status: string;
  media: { storage_url: string; type: string }[] | null;
  post_targets: TargetRow[];
};

const isDelivered = (t: TargetRow) => t.status === "published" || !!t.platform_post_id;

// Shared 6-column grid (Date · Content · Channels · Delivery · Status · Actions).
const COLS = "grid grid-cols-[128px_minmax(0,1fr)_88px_108px_120px_124px]";
const cell = "flex items-center border-r border-line/70 px-3 py-2";
const PAGE_SIZE = 10;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "failed", label: "Failed" },
] as const;
const VALID_STATUS = new Set(["scheduled", "published", "draft", "failed"]);
const NO_MATCH = "00000000-0000-0000-0000-000000000000"; // id that matches nothing

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string; channel?: string }>;
}) {
  const supabase = await createClient();
  const tz = await getTimeZone();
  const whenLabel = (iso: string | null) =>
    iso
      ? formatInTz(iso, tz, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : "—";

  const { page: pageParam, status: statusParam, q: qParam, channel: channelParam } =
    await searchParams;
  const status = statusParam && VALID_STATUS.has(statusParam) ? statusParam : "all";
  const q = (qParam ?? "").trim();
  const channel = (channelParam ?? "").trim();
  const requested = Math.max(1, Number(pageParam) || 1);
  const from = (requested - 1) * PAGE_SIZE;

  // Channels connected in this org — populate the channel dropdown.
  const { data: orgChannels } = await supabase
    .from("channels")
    .select("platform")
    .order("created_at", { ascending: true });
  const channelOptions = Array.from(
    new Set((orgChannels ?? []).map((c) => c.platform)),
  ).map((p) => ({ value: p, label: PLATFORM_LABEL[p] ?? p }));

  // Channel filter: limit to posts that target a channel on the chosen platform
  // (kept separate so the row still shows all of a post's channels).
  let channelPostIds: string[] | null = null;
  if (channel) {
    const { data: ct } = await supabase
      .from("post_targets")
      .select("post_id, channels!inner(platform)")
      .eq("channels.platform", channel);
    channelPostIds = Array.from(new Set((ct ?? []).map((r) => r.post_id)));
  }

  let query = supabase
    .from("posts")
    .select(
      "id, body, thread_tail, scheduled_at, status, media(storage_url, type), post_targets(id, status, error, attempts, next_attempt_at, platform_post_id, metrics, metrics_updated_at, channels(platform, handle))",
      { count: "exact" },
    )
    .order("scheduled_at", { ascending: true, nullsFirst: false });
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("body", `%${q}%`);
  if (channelPostIds !== null) {
    query = query.in("id", channelPostIds.length ? channelPostIds : [NO_MATCH]);
  }
  const { data: posts, count } = await query.range(from, from + PAGE_SIZE - 1);

  const rows = (posts ?? []) as unknown as PostRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, totalPages);
  const rangeStart = total === 0 ? 0 : from + 1;
  const rangeEnd = from + rows.length;

  // Build a /queue URL that keeps the active status/search/channel filters.
  const hrefWith = (over: { status?: string; page?: number }) => {
    const params = new URLSearchParams();
    const st = over.status ?? status;
    if (st !== "all") params.set("status", st);
    if (q) params.set("q", q);
    if (channel) params.set("channel", channel);
    if ((over.page ?? 1) > 1) params.set("page", String(over.page));
    const qs = params.toString();
    return `/queue${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <QueueControls channels={channelOptions} />
        <div className="ml-auto flex items-center gap-1 rounded-full bg-surface-2 p-1">
          {FILTERS.map((f) => {
            const active = status === f.key;
            return (
              <Link
                key={f.key}
                href={hrefWith({ status: f.key })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-blue text-on-blue shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-muted">
              {status === "all" && !q && !channel
                ? "No posts yet."
                : q
                  ? `No posts match “${q}”.`
                  : "No posts match these filters."}
            </p>
            {status === "all" && !q && !channel ? (
              <Link
                href="/composer"
                className="mt-3 inline-block rounded-full border border-line px-4 py-2 text-sm font-medium text-blue-ink hover:bg-surface-2"
              >
                Write your first post
              </Link>
            ) : (
              <Link
                href="/queue"
                className="mt-3 inline-block rounded-full border border-line px-4 py-2 text-sm font-medium text-blue-ink hover:bg-surface-2"
              >
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              {/* column header */}
              <div
                className={`${COLS} border-b border-line bg-surface-2/60 text-xs font-semibold text-muted`}
              >
                <div className={`${cell} py-2.5`}>Date</div>
                <div className={`${cell} py-2.5`}>Content</div>
                <div className={`${cell} py-2.5`}>Channels</div>
                <div className={`${cell} py-2.5`}>Delivery</div>
                <div className={`${cell} py-2.5`}>Status</div>
                <div className="flex items-center justify-center px-3 py-2.5">Actions</div>
              </div>

              {rows.map((p) => {
                const s = STATUS[p.status] ?? STATUS.draft;
                const targets = p.post_targets ?? [];
                const failed = targets.filter((t) => t.status === "failed" && !t.next_attempt_at);
                const deliveredN = targets.filter(isDelivered).length;
                const threadLen = p.thread_tail?.length ?? 0;

                const delivery =
                  targets.length === 0
                    ? { text: "—", cls: "text-muted" }
                    : failed.length > 0
                      ? { text: `${failed.length} failed`, cls: "text-terra" }
                      : deliveredN === targets.length
                        ? { text: "Delivered", cls: "text-green" }
                        : targets.some((t) => t.status === "failed" && t.next_attempt_at)
                          ? { text: "Retrying", cls: "text-amber" }
                          : { text: "Queued", cls: "text-[#e3a72c]" };

                return (
                  <div key={p.id} className="border-b border-line last:border-b-0">
                    <div className={`${COLS} text-sm transition-colors hover:bg-surface-2/30`}>
                      {/* date (single line) */}
                      <div className={`${cell} whitespace-nowrap font-display text-[13px] font-semibold tabular-nums`}>
                        {whenLabel(p.scheduled_at)}
                      </div>

                      {/* content */}
                      <Link href={`/composer/${p.id}`} className={`${cell} group min-w-0`}>
                        <span className="truncate group-hover:text-blue-ink">
                          {threadLen > 0 ? (
                            <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                              🧵 {threadLen + 1}
                            </span>
                          ) : null}
                          {p.body || <span className="text-muted">(empty)</span>}
                        </span>
                      </Link>

                      {/* channels — icons only */}
                      <div className={cell}>
                        {targets.length > 0 ? (
                          <div className="flex -space-x-1.5">
                            {targets.slice(0, 3).map((t) => (
                              <span
                                key={t.id}
                                title={PLATFORM_LABEL[t.channels?.platform ?? ""] ?? t.channels?.platform ?? ""}
                                className="rounded-[6px] bg-surface p-[1.5px] shadow-sm ring-1 ring-line"
                              >
                                <BrandTile platform={t.channels?.platform ?? ""} size={19} radius={5} />
                              </span>
                            ))}
                            {targets.length > 3 ? (
                              <span className="flex size-[22px] items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted ring-1 ring-line">
                                +{targets.length - 3}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>

                      {/* delivery */}
                      <div className={cell}>
                        <span className={`text-xs font-medium ${delivery.cls}`}>{delivery.text}</span>
                      </div>

                      {/* status */}
                      <div className={cell}>
                        <span className={`${pill} ${s.cls}`}>
                          <span className={`size-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>

                      {/* actions */}
                      <div className="flex items-center gap-1.5 px-2 py-2">
                        {p.status !== "published" && p.status !== "publishing" ? (
                          <Link
                            href={`/composer/${p.id}`}
                            className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-center text-xs font-semibold text-ink transition-colors hover:border-blue hover:bg-surface-2"
                          >
                            Edit
                          </Link>
                        ) : targets.some((t) => t.status === "published" || t.platform_post_id) ? (
                          <PostStatsButton
                            thread={[p.body, ...(p.thread_tail ?? [])]}
                            media={(p.media ?? []).map((mm) => ({ url: mm.storage_url, type: mm.type }))}
                            publishedAt={p.scheduled_at}
                            targets={targets.map((t) => ({
                              id: t.id,
                              platform: t.channels?.platform ?? "",
                              handle: t.channels?.handle ?? null,
                              status: t.status,
                              platform_post_id: t.platform_post_id,
                              metrics: t.metrics,
                              metricsUpdatedAt: t.metrics_updated_at,
                            }))}
                            className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-center text-xs font-semibold text-ink transition-colors hover:border-blue hover:bg-surface-2"
                          />
                        ) : null}
                        {p.status === "scheduled" ? (
                          <form action={cancelPost} className="shrink-0">
                            <input type="hidden" name="post_id" value={p.id} />
                            <SubmitButton className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:text-terra disabled:opacity-50">
                              Cancel
                            </SubmitButton>
                          </form>
                        ) : null}
                        {p.status !== "publishing" ? (
                          <span className="ml-auto shrink-0">
                            <DeletePostButton
                              action={deletePost}
                              postId={p.id}
                              published={p.status === "published"}
                            />
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* failed-delivery detail + retry */}
                    {failed.length > 0 ? (
                      <div className="flex flex-col gap-1.5 border-t border-line/60 bg-terra/[0.04] px-4 py-2">
                        {failed.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-xs">
                            <span className="shrink-0 font-semibold text-terra">
                              {PLATFORM_LABEL[t.channels?.platform ?? ""] ?? t.channels?.platform}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-terra/90">
                              {t.error ?? "Delivery failed."}
                            </span>
                            <form action={retryTarget} className="shrink-0">
                              <input type="hidden" name="target_id" value={t.id} />
                              <SubmitButton className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-blue-ink hover:bg-surface-2 disabled:opacity-50">
                                Retry
                              </SubmitButton>
                            </form>
                          </div>
                        ))}
                      </div>
                    ) : null}
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
              {rangeStart}–{rangeEnd} of {total}
            </span>
            {totalPages > 1 ? (
            <div className="flex items-center gap-1.5">
              {page > 1 ? (
                <Link
                  href={hrefWith({ page: page - 1 })}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  ‹ Previous
                </Link>
              ) : (
                <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted opacity-50">
                  ‹ Previous
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={hrefWith({ page: page + 1 })}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
                >
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
