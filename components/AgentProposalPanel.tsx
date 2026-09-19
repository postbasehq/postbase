"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PostPreview } from "@/components/PostPreview";
import { BrandTile } from "@/components/BrandTile";
import { scheduleProposedPost, type ConfirmProposal } from "@/app/(app)/agent/confirm-actions";
import type { AgentChannel, AgentProposal } from "@/lib/agent/ui-store";

function PanelTab({
  active,
  dot,
  title,
  onClick,
  children,
}: {
  active: boolean;
  dot?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
        active ? "bg-surface-2 text-ink shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {children}
      {dot ? <span className="size-1.5 rounded-full bg-blue" /> : null}
    </button>
  );
}

// ── Proposed-post panel: review + edit + schedule, stacked vertically ───────
export function AgentProposalPanel({
  proposal,
  channels,
  onClose,
}: {
  proposal: AgentProposal;
  channels: AgentChannel[];
  onClose?: () => void;
}) {
  const initialSegments = proposal.thread.length > 1 ? proposal.thread : [proposal.body];
  const [segments, setSegments] = useState<string[]>(initialSegments);
  const [selected, setSelected] = useState<string[]>(
    proposal.channelIds.filter((id) => channels.some((c) => c.id === id)),
  );
  const [when, setWhen] = useState<string>(toLocalInput(proposal.scheduledAt));
  const [showPreview, setShowPreview] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Record<string, string>>(proposal.variants ?? {});
  const [activeTab, setActiveTab] = useState<string>("base");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; status?: string } | null>(null);

  useEffect(() => {
    if (activeTab !== "base" && !selected.includes(activeTab)) setActiveTab("base");
  }, [selected, activeTab]);

  const media = proposal.media;
  const baseCaption = segments.filter((s) => s.trim()).join("\n\n");
  const activePreviewId = previewId && selected.includes(previewId) ? previewId : selected[0];
  const previewChannel =
    channels.find((c) => c.id === activePreviewId) ??
    channels.find((c) => c.id === proposal.channelIds[0]);
  const previewVariant = previewChannel ? variants[previewChannel.id]?.trim() : "";
  const previewThread = previewVariant ? [previewVariant] : segments;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const schedule = async () => {
    if (saving || result?.ok) return;
    setSaving(true);
    const payload: ConfirmProposal = {
      body: segments[0] ?? "",
      thread: segments.slice(1),
      channelIds: selected,
      scheduledAt: when ? fromLocalInput(when) : null,
      media,
      variants: Object.fromEntries(
        Object.entries(variants).filter(([k, v]) => selected.includes(k) && v.trim()),
      ),
    };
    const res = await scheduleProposedPost(payload);
    if (res.ok) {
      setResult({
        ok: true,
        status: res.status,
        msg: res.status === "scheduled" ? "Scheduled" : "Saved as draft",
      });
    } else {
      setResult({ ok: false, msg: res.error });
    }
    setSaving(false);
  };

  return (
    <div className="flex h-full w-full flex-col bg-ground">
      {/* header */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-5">
        <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">
          Proposed post
        </h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {result?.ok ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-green text-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <div className="font-display text-base font-semibold text-ink">{result.msg}</div>
            <div className="pt-0.5 text-[13px] text-muted">
              Your post is {result.status === "scheduled" ? "in the queue" : "saved to drafts"}.
            </div>
          </div>
          <Link
            href={result.status === "scheduled" ? "/queue" : "/drafts"}
            className="rounded-xl bg-blue px-4 py-2 text-sm font-semibold text-on-blue"
          >
            {result.status === "scheduled" ? "View in queue" : "View draft"}
          </Link>
        </div>
      ) : (
        <>
          {/* scrollable body */}
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
            <div>
              <div className="pb-2 text-xs font-semibold text-muted">Channels</div>
              <div className="flex flex-wrap items-center gap-2">
                {channels.length === 0 ? (
                  <Link href="/channels" className="text-[13px] font-medium text-blue">
                    Connect a channel →
                  </Link>
                ) : (
                  channels.map((c) => {
                    const on = selected.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggle(c.id)}
                        aria-pressed={on}
                        title={c.handle ? `@${c.handle.replace(/^@/, "")}` : c.platform}
                        className={`rounded-full transition ${
                          on
                            ? "ring-2 ring-blue ring-offset-2 ring-offset-surface"
                            : "opacity-45 hover:opacity-100"
                        }`}
                      >
                        <BrandTile platform={c.platform} size={30} radius={15} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-muted">Text</div>

              {selected.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 p-1">
                  <PanelTab active={activeTab === "base"} onClick={() => setActiveTab("base")}>
                    All
                  </PanelTab>
                  {selected.map((id) => {
                    const c = channels.find((x) => x.id === id);
                    if (!c) return null;
                    return (
                      <PanelTab
                        key={id}
                        active={activeTab === id}
                        dot={!!variants[id]?.trim()}
                        title={c.handle ? `@${c.handle.replace(/^@/, "")}` : c.platform}
                        onClick={() => setActiveTab(id)}
                      >
                        <BrandTile platform={c.platform} size={14} radius={4} />
                        <span className="max-w-[110px] truncate">
                          {c.handle ? `@${c.handle.replace(/^@/, "")}` : c.platform}
                        </span>
                      </PanelTab>
                    );
                  })}
                </div>
              ) : null}

              {activeTab === "base" ? (
                segments.map((seg, i) => (
                  <div key={i}>
                    {segments.length > 1 ? (
                      <div className="pb-1 text-[11px] font-medium text-muted">Post {i + 1}</div>
                    ) : null}
                    <textarea
                      value={seg}
                      onChange={(e) =>
                        setSegments((prev) => prev.map((s, j) => (j === i ? e.target.value : s)))
                      }
                      rows={segments.length > 1 ? 3 : 5}
                      className="w-full resize-y rounded-xl border border-line bg-surface p-2.5 text-sm text-ink outline-none focus:border-blue"
                    />
                  </div>
                ))
              ) : (
                <div className="space-y-1.5">
                  <textarea
                    value={variants[activeTab] ?? ""}
                    onChange={(e) => setVariants((p) => ({ ...p, [activeTab]: e.target.value }))}
                    rows={5}
                    placeholder="Customize this channel's caption… (empty = use the main text)"
                    className="w-full resize-y rounded-xl border border-line bg-surface p-2.5 text-sm text-ink outline-none focus:border-blue"
                  />
                  <div className="flex items-center gap-3 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setVariants((p) => ({ ...p, [activeTab]: baseCaption }))}
                      className="font-medium text-blue"
                    >
                      Copy main text
                    </button>
                    {variants[activeTab]?.trim() ? (
                      <button
                        type="button"
                        onClick={() =>
                          setVariants((p) => {
                            const next = { ...p };
                            delete next[activeTab];
                            return next;
                          })
                        }
                        className="ml-auto text-muted hover:text-ink"
                      >
                        Use main
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="pb-2 text-xs font-semibold text-muted">When</div>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-blue"
              />
              <p className="pt-1 text-[11px] text-muted">Leave empty to save as a draft.</p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                aria-expanded={showPreview}
                className="flex w-full items-center gap-2 pb-2 text-xs font-semibold text-muted transition hover:text-ink"
              >
                Preview
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className={`ml-auto transition-transform ${showPreview ? "" : "-rotate-90"}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {showPreview ? (
                <>
                  {selected.length > 1 ? (
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                      {selected.map((id) => {
                        const c = channels.find((x) => x.id === id);
                        if (!c) return null;
                        const on = id === activePreviewId;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPreviewId(id)}
                            title={c.handle ? `@${c.handle.replace(/^@/, "")}` : c.platform}
                            className={`flex size-7 items-center justify-center rounded-lg transition ${
                              on ? "bg-blue-soft" : "opacity-50 hover:bg-surface-2 hover:opacity-100"
                            }`}
                          >
                            <BrandTile platform={c.platform} size={16} radius={4} />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {previewChannel ? (
                    <PostPreview
                      platform={previewChannel.platform}
                      handle={previewChannel.handle}
                      displayName={previewChannel.displayName}
                      avatarUrl={previewChannel.avatarUrl}
                      verified={previewChannel.verified}
                      thread={previewThread}
                      media={media}
                      metrics={null}
                      publishedAt={when ? fromLocalInput(when) : null}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-muted">
                      Select a channel to preview.
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* sticky footer */}
          <div className="flex shrink-0 items-center gap-2 border-t border-line px-5 py-3.5">
            {result && !result.ok ? (
              <span className="text-[13px]" style={{ color: "#d14a3e" }}>
                {result.msg}
              </span>
            ) : (
              <span className="text-[12px] text-muted">
                {selected.length} channel{selected.length === 1 ? "" : "s"} ·{" "}
                {when ? "scheduled" : "draft"}
              </span>
            )}
            <button
              type="button"
              onClick={schedule}
              disabled={saving || selected.length === 0}
              className="ml-auto rounded-xl bg-blue px-4 py-2 text-sm font-semibold text-on-blue transition disabled:opacity-40"
            >
              {saving ? "Saving…" : when ? "Schedule" : "Save draft"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// datetime-local <-> ISO helpers (local wall-clock time)
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(local: string): string {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
