"use client";

import Link from "next/link";
import { BrandTile } from "@/components/BrandTile";
import type { AgentList } from "@/lib/agent/tools";

/**
 * Renders a posts/drafts listing the agent pulled, in the same presentable
 * style as the composer's "Load a draft" picker — channel tiles, truncated
 * body, and a time/status column — instead of the model dumping a markdown
 * table into the chat. Rows link to the composer for editing.
 */
function fmtWhen(iso: string | null): string {
  if (!iso) return "Draft";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Draft";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AgentPostsList({ list }: { list: AgentList }) {
  const rows = list.rows;
  if (rows.length === 0) {
    return (
      <div className="w-full rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center text-[13px] text-muted">
        Nothing here yet.
      </div>
    );
  }
  return (
    <div className="w-full overflow-hidden rounded-xl border border-line bg-surface">
      <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-muted">
        <span>{list.title}</span>
        <span>When</span>
      </div>
      <div className="divide-y divide-line/70">
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/composer/${r.id}`}
            className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              {r.channels.length > 0 ? (
                <span className="flex shrink-0 -space-x-1.5">
                  {r.channels.slice(0, 3).map((c, i) => (
                    <span
                      key={i}
                      className="rounded-[6px] bg-surface p-[1.5px] shadow-sm ring-1 ring-line"
                    >
                      <BrandTile platform={c.platform} size={18} radius={5} />
                    </span>
                  ))}
                  {r.channels.length > 3 ? (
                    <span className="flex size-[21px] items-center justify-center rounded-[6px] bg-surface-2 text-[10px] font-semibold text-muted ring-1 ring-line">
                      +{r.channels.length - 3}
                    </span>
                  ) : null}
                </span>
              ) : null}
              <span className="min-w-0 truncate text-sm text-ink">
                {r.body || <span className="text-muted">(empty)</span>}
              </span>
            </span>
            <span className="whitespace-nowrap text-xs font-medium text-muted tabular-nums">
              {fmtWhen(r.scheduledAt)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
