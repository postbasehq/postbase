"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * Disconnect a channel behind a custom confirmation modal (it's destructive —
 * removes the channel and its per-channel history). Wraps a server action.
 *
 * The dialog is portaled to <body> so it can't be trapped by a channel card's
 * stacking/transform context (which would let sibling cards paint over it).
 */
export function DisconnectButton({
  action,
  channelId,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  channelId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  // Close on Escape + lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-[#d14a3e] hover:text-[#d14a3e]"
      >
        Disconnect
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="absolute inset-0 cursor-default bg-black/50"
              />
              <div className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-lg">
                <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">
                  Disconnect {label}?
                </h3>
                <p className="mt-1.5 text-sm text-muted">
                  This removes the channel and its post history from Postbase. You can reconnect it
                  anytime.
                </p>
                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <form action={action}>
                    <input type="hidden" name="channel_id" value={channelId} />
                    <SubmitButton
                      pendingLabel="Disconnecting…"
                      className="rounded-full bg-[#d14a3e] px-4 py-2 font-display text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
                    >
                      Disconnect
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
