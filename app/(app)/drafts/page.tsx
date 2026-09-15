import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone, formatInTz } from "@/lib/tz";
import { BrandTile } from "@/components/BrandTile";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteDraft } from "../actions";

type Row = {
  id: string;
  body: string;
  thread_tail: string[] | null;
  updated_at: string | null;
  post_targets: { channels: { platform: string } | null }[] | null;
};

export default async function DraftsPage() {
  const supabase = await createClient();
  const tz = await getTimeZone();

  const { data } = await supabase
    .from("posts")
    .select("id, body, thread_tail, updated_at, post_targets(channels(platform))")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as Row[];
  const whenLabel = (iso: string | null) =>
    iso
      ? formatInTz(iso, tz, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <div>
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted">
          Unscheduled posts you’re still working on. {rows.length} draft{rows.length === 1 ? "" : "s"}.
        </p>
        <Link
          href="/composer"
          className="ml-auto rounded-full bg-blue px-4 py-2 font-display text-sm font-semibold text-on-blue shadow-sm"
        >
          New draft
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-muted">No drafts yet.</p>
            <Link
              href="/composer"
              className="mt-3 inline-block rounded-full border border-line px-4 py-2 text-sm font-medium text-blue-ink hover:bg-surface-2"
            >
              Start a draft
            </Link>
          </div>
        ) : (
          rows.map((p, i) => {
            const platforms = Array.from(
              new Set((p.post_targets ?? []).map((t) => t.channels?.platform).filter(Boolean)),
            ) as string[];
            const threadLen = p.thread_tail?.length ?? 0;
            return (
              <div
                key={p.id}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-3.5 px-4 py-3.5 ${
                  i < rows.length - 1 ? "border-b border-line" : ""
                }`}
              >
                {/* target channels (or a draft dot) */}
                <div className="flex w-14 items-center">
                  {platforms.length > 0 ? (
                    <div className="flex -space-x-1.5">
                      {platforms.slice(0, 3).map((pl) => (
                        <span key={pl} className="rounded-[7px] bg-surface p-[1.5px] shadow-sm ring-1 ring-line">
                          <BrandTile platform={pl} size={20} radius={5} />
                        </span>
                      ))}
                      {platforms.length > 3 ? (
                        <span className="flex size-[23px] items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted ring-1 ring-line">
                          +{platforms.length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="size-2 rounded-full bg-muted" title="No channels selected" />
                  )}
                </div>

                {/* body preview */}
                <Link href={`/composer/${p.id}`} className="min-w-0 group">
                  <div className="truncate text-sm group-hover:text-blue-ink">
                    {threadLen > 0 ? (
                      <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                        🧵 {threadLen + 1}
                      </span>
                    ) : null}
                    {p.body || <span className="text-muted">(empty draft)</span>}
                  </div>
                </Link>

                {/* meta + actions */}
                <div className="flex items-center gap-4">
                  <span className="hidden font-display text-[13px] font-semibold tabular-nums text-muted sm:block">
                    {whenLabel(p.updated_at)}
                  </span>
                  <Link href={`/composer/${p.id}`} className="text-xs text-muted hover:text-ink">
                    Edit
                  </Link>
                  <form action={deleteDraft}>
                    <input type="hidden" name="post_id" value={p.id} />
                    <SubmitButton className="text-xs text-muted hover:text-terra disabled:opacity-50">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
