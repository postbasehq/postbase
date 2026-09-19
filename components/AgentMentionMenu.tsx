"use client";

import { useEffect, useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { listContextPosts } from "@/app/(app)/agent/context-actions";
import type { AgentPostRow } from "@/lib/agent/tools";

/**
 * The @-mention context picker that drops up above the composer. Level 1 is the
 * two categories (drafts / scheduled); picking one loads its posts, and picking
 * a post hands it back to the chat as context.
 */
type View = "root" | "draft" | "scheduled";

function fmtWhen(iso: string | null): string {
  if (!iso) return "Draft";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Draft";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AgentMentionMenu({
  onPick,
  onClose,
}: {
  onPick: (post: AgentPostRow) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("root");
  const [rows, setRows] = useState<AgentPostRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (view === "root") return;
    let alive = true;
    setLoading(true);
    listContextPosts(view)
      .then((r) => {
        if (alive) setRows(r);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [view]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
      {view === "root" ? (
        <div className="p-1.5">
          <div className="px-2.5 pb-1 pt-1 text-[11px] font-semibold text-muted">Add context</div>
          <MenuRow
            icon={
              <>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6M8 13h8M8 17h5" />
              </>
            }
            label="Drafts"
            onClick={() => setView("draft")}
          />
          <MenuRow
            icon={
              <>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </>
            }
            label="Scheduled posts"
            onClick={() => setView("scheduled")}
          />
        </div>
      ) : (
        <div className="flex max-h-72 flex-col">
          <div className="flex items-center gap-1.5 border-b border-line px-2 py-2">
            <button
              type="button"
              onClick={() => setView("root")}
              aria-label="Back"
              className="flex size-6 items-center justify-center rounded-md text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-[13px] font-semibold text-ink">
              {view === "draft" ? "Drafts" : "Scheduled posts"}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {loading ? (
              <p className="px-3 py-4 text-center text-[12px] text-muted">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px] text-muted">
                {view === "draft" ? "No drafts yet." : "Nothing scheduled."}
              </p>
            ) : (
              rows.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onPick(p);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface-2"
                >
                  {p.channels.length > 0 ? (
                    <span className="flex shrink-0 -space-x-1.5">
                      {p.channels.slice(0, 3).map((c, i) => (
                        <span key={i} className="rounded-[5px] bg-surface p-[1.5px] ring-1 ring-line">
                          <BrandTile platform={c.platform} size={15} radius={4} />
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                    {p.body || <span className="text-muted">(empty)</span>}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted">{fmtWhen(p.scheduledAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition hover:bg-surface-2"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
        {icon}
      </svg>
      <span className="flex-1">{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}
