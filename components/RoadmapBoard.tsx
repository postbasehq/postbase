"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { submitIdea, toggleVote, type FeedbackState } from "@/app/(app)/feedback-actions";
import type { BoardItem, BoardStatus } from "@/lib/feedback";

const STATUS: Record<BoardStatus, { label: string; cls: string } | null> = {
  open: null,
  planned: { label: "Planned", cls: "bg-blue-soft text-blue-ink" },
  in_progress: { label: "In progress", cls: "bg-amber/15 text-amber-bright" },
  done: { label: "Shipped", cls: "bg-green/15 text-green" },
  declined: null,
};

function VoteButton({ item }: { item: BoardItem }) {
  return (
    <form action={toggleVote}>
      <input type="hidden" name="id" value={item.id} />
      <button
        type="submit"
        aria-pressed={item.voted}
        className={`flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-center transition ${
          item.voted
            ? "border-blue bg-blue-soft text-blue-ink"
            : "border-line text-muted hover:border-blue/50 hover:text-ink"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 15 6-6 6 6" />
        </svg>
        <span className="text-[13px] font-bold tabular-nums">{item.votes}</span>
      </button>
    </form>
  );
}

export function RoadmapBoard({ items }: { items: BoardItem[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitIdea, {});
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  // Close + reset the composer once an idea posts successfully.
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setTitle("");
      setDetails("");
    }
  }, [state.ok]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Shape what we build next. Upvote the ideas you want most, or add your own.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue px-4 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Suggest an idea
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center shadow-sm">
          <span className="text-muted" aria-hidden>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1v.2h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
            </svg>
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold tracking-[-0.01em]">No ideas yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            Be the first to suggest something — the ideas with the most votes rise to the top.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2.5">
          {items.map((item) => {
            const badge = STATUS[item.status];
            return (
              <li
                key={item.id}
                className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-4 shadow-sm"
              >
                <VoteButton item={item} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em]">
                      {item.title}
                    </h3>
                    {badge ? (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    ) : null}
                  </div>
                  {item.body ? (
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{item.body}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="idea-title"
        size="md"
        panelClassName="border border-white/12 bg-surface/80 p-6 shadow-[0_28px_80px_-24px_rgba(16,24,40,0.7)] backdrop-blur-2xl"
        panelStyle={{
          backgroundImage: [
            "radial-gradient(120% 90% at 0% 0%, #2b59d93d, transparent 55%)",
            "radial-gradient(110% 80% at 100% 4%, #e3a72c2e, transparent 52%)",
            "radial-gradient(120% 85% at 100% 100%, #d14a3e29, transparent 55%)",
          ].join(","),
        }}
      >
        <h3 id="idea-title" className="font-display text-xl font-semibold tracking-[-0.01em]">
          Suggest an idea
        </h3>
        <p className="mt-1 text-[13px] text-muted">
          Others can upvote it — the most-wanted ideas float to the top.
        </p>

        <form action={action} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Title</span>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              maxLength={140}
              placeholder="e.g. Bulk-schedule from a CSV"
              className="rounded-xl border border-line bg-ground/70 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus-visible:border-blue"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Details <span className="font-normal text-muted/70">(optional)</span></span>
            <textarea
              name="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="What problem would this solve for you?"
              className="resize-none rounded-xl border border-line bg-ground/70 px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-muted focus-visible:border-blue"
            />
          </label>

          {state.error ? <p className="text-[13px] text-terra">{state.error}</p> : null}

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              Cancel
            </button>
            <SubmitButton
              disabled={title.trim().length === 0 || pending}
              pendingLabel="Posting…"
              className="rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              Post idea
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
