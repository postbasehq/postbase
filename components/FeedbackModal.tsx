"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";
import { submitFeedback, type FeedbackState } from "@/app/(app)/feedback-actions";

const CATEGORIES: { value: string; label: string; icon: React.ReactNode }[] = [
  {
    value: "idea",
    label: "Idea",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1v.2h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
      </svg>
    ),
  },
  {
    value: "issue",
    label: "Issue",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 2 1.5 1.5M16 2l-1.5 1.5M12 20v2M4.5 12H2M22 12h-2.5M5 7l-2-1M19 7l2-1" />
        <rect x="8" y="6" width="8" height="12" rx="4" />
        <path d="M12 10v4" />
      </svg>
    ),
  },
  {
    value: "praise",
    label: "Praise",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-4.5-9.5-9C1 9 2 5.5 5.2 4.6 7.3 4 9.3 4.9 12 8c2.7-3.1 4.7-4 6.8-3.4C22 5.5 23 9 21.5 12 19 16.5 12 21 12 21z" />
      </svg>
    ),
  },
  {
    value: "other",
    label: "Other",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitFeedback, {});
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");

  // Reset the form whenever the modal is reopened after a successful send.
  useEffect(() => {
    if (open && state.ok) {
      setMessage("");
      setCategory("idea");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="feedback-title"
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
      {state.ok ? (
        <div className="py-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full text-white" style={{ backgroundColor: "#2b59d9" }} aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h3 id="feedback-title" className="mt-4 font-display text-xl font-semibold tracking-[-0.01em]">
            Thank you 🙌
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
            Your feedback landed with the team. We read every note — it genuinely shapes what we build next.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-full bg-blue px-6 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center text-blue-ink" aria-hidden>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 9h8M8 13h5" />
              </svg>
            </span>
            <div>
              <h3 id="feedback-title" className="font-display text-xl font-semibold tracking-[-0.01em]">
                Send feedback
              </h3>
              <p className="text-[13px] text-muted">
                What's working, what's not, or what you'd love to see.
              </p>
            </div>
          </div>

          <form action={action} className="mt-5 flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">Type</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const on = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${
                        on
                          ? "border-blue bg-blue-soft text-blue-ink shadow-sm"
                          : "border-line text-muted hover:border-blue/40 hover:text-ink"
                      }`}
                    >
                      {c.icon}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <input type="hidden" name="category" value={category} />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">Your message</span>
              <textarea
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                autoFocus
                placeholder="Tell us more…"
                className="resize-none rounded-xl border border-line bg-ground/70 px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-muted focus-visible:border-blue"
              />
            </label>

            {state.error ? <p className="text-[13px] text-terra">{state.error}</p> : null}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
              >
                Cancel
              </button>
              <SubmitButton
                disabled={message.trim().length === 0}
                pendingLabel="Sending…"
                className="rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send feedback
              </SubmitButton>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
