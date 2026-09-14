import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone, formatInTz } from "@/lib/tz";
import { SubmitButton } from "@/components/SubmitButton";
import { cancelPost, retryTarget } from "../actions";

const pill =
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold font-display whitespace-nowrap";

const STATUS: Record<string, { cls: string; dot: string; label: string }> = {
  draft: { cls: "bg-surface-2 text-muted", dot: "bg-muted", label: "Draft" },
  scheduled: { cls: "bg-blue-soft text-blue-ink", dot: "bg-blue", label: "Scheduled" },
  publishing: { cls: "bg-amber-bright/15 text-amber", dot: "bg-amber-bright", label: "Publishing" },
  published: { cls: "bg-green/15 text-green", dot: "bg-green", label: "Published" },
  failed: { cls: "bg-terra/12 text-terra", dot: "bg-terra", label: "Failed" },
};

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

type TargetRow = {
  id: string;
  status: string;
  error: string | null;
  attempts: number;
  next_attempt_at: string | null;
  platform_post_id: string | null;
  channels: { platform: string; handle: string | null } | null;
};
type PostRow = {
  id: string;
  body: string;
  thread_tail: string[] | null;
  scheduled_at: string | null;
  status: string;
  post_targets: TargetRow[];
};

// Per-channel delivery display, derived from a target's row.
function targetDisplay(t: TargetRow): { label: string; cls: string; dot: string } {
  if (t.status === "published" || t.platform_post_id)
    return { label: "Delivered", cls: "text-green", dot: "bg-green" };
  if (t.status === "failed" && t.next_attempt_at)
    return { label: "Retrying", cls: "text-amber", dot: "bg-amber-bright" };
  if (t.status === "failed") return { label: "Failed", cls: "text-terra", dot: "bg-terra" };
  if (t.status === "publishing")
    return { label: "Publishing", cls: "text-amber", dot: "bg-amber-bright" };
  return { label: "Queued", cls: "text-muted", dot: "bg-muted" };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const tz = await getTimeZone();
  const whenLabel = (iso: string | null) =>
    iso
      ? formatInTz(iso, tz, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : "—";

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, body, thread_tail, scheduled_at, status, post_targets(id, status, error, attempts, next_attempt_at, platform_post_id, channels(platform, handle))",
    )
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(25);

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle, status")
    .order("created_at", { ascending: true });

  const rows = (posts ?? []) as unknown as PostRow[];

  // Delivery summary across the loaded posts.
  const allTargets = rows.flatMap((r) => r.post_targets ?? []);
  const summary = {
    delivered: allTargets.filter((t) => t.status === "published" || t.platform_post_id).length,
    retrying: allTargets.filter((t) => t.status === "failed" && t.next_attempt_at).length,
    failed: allTargets.filter((t) => t.status === "failed" && !t.next_attempt_at).length,
  };

  return (
    <div className="mx-auto max-w-[960px]">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm text-muted">Your scheduled posts and channels.</p>
        </div>
        <Link
          href="/composer"
          className="ml-auto rounded-full bg-blue px-4 py-2 font-display text-sm font-semibold text-on-blue shadow-sm"
        >
          New post
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* queue */}
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <h2 className="font-display text-sm font-semibold">Queue</h2>
            <div className="ml-auto flex items-center gap-3 text-xs">
              {summary.delivered > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-green">
                  <span className="size-2 rounded-full bg-green" />
                  {summary.delivered} delivered
                </span>
              ) : null}
              {summary.retrying > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-amber">
                  <span className="size-2 rounded-full bg-amber-bright" />
                  {summary.retrying} retrying
                </span>
              ) : null}
              {summary.failed > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-terra">
                  <span className="size-2 rounded-full bg-terra" />
                  {summary.failed} failed
                </span>
              ) : null}
              <span className="text-muted">
                {rows.length} post{rows.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted">No posts yet.</p>
              <Link
                href="/composer"
                className="mt-3 inline-block rounded-full border border-line px-4 py-2 text-sm font-medium text-blue-ink hover:bg-surface-2"
              >
                Write your first post
              </Link>
            </div>
          ) : (
            rows.map((p, i) => {
              const s = STATUS[p.status] ?? STATUS.draft;
              const targets = p.post_targets ?? [];
              const failed = targets.filter((t) => t.status === "failed" && !t.next_attempt_at);
              return (
                <div
                  key={p.id}
                  className={`flex flex-col gap-2 px-4 py-3.5 ${
                    i < rows.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3.5">
                    <span className="font-display text-[13px] font-semibold tabular-nums text-muted">
                      {whenLabel(p.scheduled_at)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm">
                        {(p.thread_tail?.length ?? 0) > 0 ? (
                          <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                            🧵 {(p.thread_tail?.length ?? 0) + 1}
                          </span>
                        ) : null}
                        {p.body || "(empty)"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`${pill} ${s.cls}`}>
                        <span className={`size-2 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                      <div className="flex items-center gap-3">
                        {p.status !== "published" && p.status !== "publishing" ? (
                          <Link
                            href={`/composer/${p.id}`}
                            className="text-xs text-muted hover:text-ink"
                          >
                            Edit
                          </Link>
                        ) : null}
                        {p.status === "scheduled" ? (
                          <form action={cancelPost}>
                            <input type="hidden" name="post_id" value={p.id} />
                            <SubmitButton className="text-xs text-muted hover:text-terra disabled:opacity-50">
                              Cancel
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* per-channel delivery */}
                  {targets.length === 0 ? (
                    <div className="text-xs text-muted">No channels</div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {targets.map((t) => {
                        const d = targetDisplay(t);
                        const label = PLATFORM_LABEL[t.channels?.platform ?? ""] ?? t.channels?.platform ?? "—";
                        return (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 text-xs"
                            title={t.error ?? undefined}
                          >
                            <span className={`size-2 rounded-full ${d.dot}`} />
                            <span className="font-medium">{label}</span>
                            <span className={d.cls}>{d.label}</span>
                            {t.status === "failed" ? (
                              <form action={retryTarget}>
                                <input type="hidden" name="target_id" value={t.id} />
                                <SubmitButton className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-blue-ink hover:bg-surface-2 disabled:opacity-50">
                                  Retry
                                </SubmitButton>
                              </form>
                            ) : null}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* error detail for terminally-failed channels */}
                  {failed.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {failed.map((t) => (
                        <div key={t.id} className="text-xs text-terra">
                          <span className="font-medium">
                            {PLATFORM_LABEL[t.channels?.platform ?? ""] ?? t.channels?.platform}:
                          </span>{" "}
                          {t.error ?? "Delivery failed."}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </section>

        {/* channels */}
        <section className="h-fit overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="font-display text-sm font-semibold">Channels</h2>
            <Link href="/channels" className="ml-auto text-xs font-medium text-blue-ink hover:underline">
              Manage
            </Link>
          </div>
          {!channels || channels.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No channels.{" "}
              <Link href="/channels" className="font-medium text-blue-ink underline">
                Add one
              </Link>
            </p>
          ) : (
            channels.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  i < channels.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="size-2.5 rounded-full bg-green" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {PLATFORM_LABEL[c.platform] ?? c.platform}
                  </div>
                  <div className="truncate text-xs text-muted">{c.handle ?? "—"}</div>
                </div>
                <span className="ml-auto text-xs text-muted">
                  {c.status === "stub" ? "Stub" : c.status}
                </span>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
