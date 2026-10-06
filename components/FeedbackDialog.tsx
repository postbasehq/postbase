"use client";

import { useActionState, useEffect, useRef, useState, startTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/Modal";
import { sendFeedback, type FeedbackState } from "@/app/(app)/feedback-actions";
import { FEEDBACK_MAX_CHARS, FEEDBACK_MAX_SCREENSHOT_BYTES, type FeedbackKind } from "@/lib/email/feedback";

const KINDS: { id: FeedbackKind; label: string; hint: string; color: string; placeholder: string; icon: ReactNode }[] = [
  {
    id: "bug",
    label: "Bug",
    hint: "Something’s broken",
    color: "#d14a3e",
    placeholder: "What happened, and what did you expect? Steps to reproduce help a lot.",
    icon: <BugGlyph />,
  },
  {
    id: "idea",
    label: "Idea",
    hint: "Something to add",
    color: "#e3a72c",
    placeholder: "What would you like Postbase to do, and what would it help with?",
    icon: (
      <>
        <path d="M9 18h6M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" />
      </>
    ),
  },
  {
    id: "other",
    label: "Other",
    hint: "Anything else",
    color: "#2b59d9",
    placeholder: "Tell us what’s on your mind.",
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
];

export function BugGlyph() {
  return (
    <>
      <path d="m8 2 1.88 1.88M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </>
  );
}

function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {children}
    </svg>
  );
}

/**
 * Downscale a screenshot to a JPEG that fits the server action's body limit.
 * Retina screenshots are several MB; 1600px wide at q≈0.85 is plenty to read.
 */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    for (const [maxW, quality] of [[1600, 0.85], [1280, 0.75], [1000, 0.65]] as const) {
      const scale = Math.min(1, maxW / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= FEEDBACK_MAX_SCREENSHOT_BYTES) return blob;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("too-large");
}

const HELP_LINKS: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: "Docs",
    href: "https://docs.postbase.so",
    icon: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
  },
  {
    label: "Quickstart",
    href: "https://docs.postbase.so/general/quickstart",
    icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  },
  {
    label: "Connecting channels",
    href: "https://docs.postbase.so/using/channels",
    icon: (
      <>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </>
    ),
  },
  {
    label: "Email us",
    href: "mailto:team@postbase.so",
    icon: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </>
    ),
  },
];

/** Feedback type dropdown (Bug / Idea / Other). */
function KindPicker({ value, onChange }: { value: FeedbackKind; onChange: (k: FeedbackKind) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = KINDS.find((k) => k.id === value)!;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        // Escape closes the menu, not the whole dialog.
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <span id="feedback-kind-label" className="mb-1.5 block text-[13px] font-medium text-ink">
        Type
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="feedback-kind-label"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left transition hover:bg-surface-2 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30"
      >
        <span style={{ color: current.color }}>
          <Svg>{current.icon}</Svg>
        </span>
        <span className="text-sm font-medium text-ink">{current.label}</span>
        <span className="truncate text-[13px] text-muted">{current.hint}</span>
        <span className={`ml-auto text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          <Svg size={15}>
            <path d="m6 9 6 6 6-6" />
          </Svg>
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-labelledby="feedback-kind-label"
          className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          {KINDS.map((k) => {
            const on = k.id === value;
            return (
              <button
                key={k.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(k.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-surface-2 ${on ? "bg-surface-2" : ""}`}
              >
                <span style={{ color: k.color }}>
                  <Svg>{k.icon}</Svg>
                </span>
                <span className="text-sm font-medium text-ink">{k.label}</span>
                <span className="text-[13px] text-muted">{k.hint}</span>
                {on ? (
                  <span className="ml-auto text-blue-ink">
                    <Svg size={15}>
                      <path d="M20 6 9 17l-5-5" />
                    </Svg>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** The sidebar's Feedback item: opens the bug/feedback form. */
export function FeedbackNavButton({ className, children }: { className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Remount the form on each open so it starts fresh after a send.
  const [session, setSession] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSession((s) => s + 1);
          setOpen(true);
        }}
        className={`${className} w-full text-left`}
      >
        {children}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="feedback-title" size="lg" panelClassName="border border-line bg-surface p-0 shadow-lg">
        <FeedbackForm key={session} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function FeedbackForm({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [state, action, pending] = useActionState<FeedbackState, FormData>(sendFeedback, null);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [shotError, setShotError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const current = KINDS.find((k) => k.id === kind)!;

  useEffect(() => {
    textRef.current?.focus();
  }, []);
  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  async function attach(file: File | null | undefined) {
    if (!file) return;
    setShotError(null);
    if (!file.type.startsWith("image/")) {
      setShotError("That isn’t an image. Attach a PNG, JPEG or WebP screenshot.");
      return;
    }
    setProcessing(true);
    try {
      const blob = await shrinkImage(file);
      setShot({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setShotError("We couldn’t use that image. Try a smaller screenshot.");
    } finally {
      setProcessing(false);
    }
  }

  // Paste a screenshot straight into the form (Cmd/Ctrl+V).
  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      e.preventDefault();
      void attach(item.getAsFile());
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("message", message);
    fd.set("page", typeof window !== "undefined" ? window.location.origin + (pathname ?? "") : pathname ?? "");
    fd.set("userAgent", navigator.userAgent);
    if (shot) fd.set("screenshot", new File([shot.blob], "screenshot.jpg", { type: "image/jpeg" }));
    startTransition(() => action(fd));
  }

  if (state?.ok) {
    return (
      <div className="px-6 pb-6 pt-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full text-white" style={{ backgroundColor: "#2b59d9" }} aria-hidden>
          <Svg size={22}>
            <path d="M20 6 9 17l-5-5" />
          </Svg>
        </span>
        <h3 id="feedback-title" className="mt-4 font-display text-lg font-semibold tracking-[-0.01em]">
          Thanks, we’ve got it
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
          It’s in the team inbox now. A person reads every message, and we’ll reply by email if we need more detail.
        </p>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-full bg-blue px-5 py-2.5 text-sm font-semibold text-on-blue transition hover:shadow">
            Done
          </button>
        </div>
      </div>
    );
  }

  const tooShort = message.trim().length < 5;
  const busy = pending || processing;

  return (
    <form onSubmit={submit} onPaste={onPaste}>
      <div className="flex items-start gap-3.5 px-6 pt-6">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl text-white transition-colors"
          style={{ backgroundColor: current.color }}
          aria-hidden
        >
          <Svg size={19}>{current.icon}</Svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="feedback-title" className="font-display text-lg font-semibold tracking-[-0.01em]">
            Send feedback
          </h3>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">Report a bug or share an idea. It goes straight to the team.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <Svg>
            <path d="M18 6 6 18M6 6l12 12" />
          </Svg>
        </button>
      </div>

      <div className="space-y-4 px-6 pb-5 pt-5">
        <KindPicker value={kind} onChange={setKind} />

        <div>
          <label htmlFor="feedback-message" className="mb-1.5 block text-[13px] font-medium text-ink">
            {kind === "bug" ? "What went wrong?" : kind === "idea" ? "What’s your idea?" : "Your message"}
          </label>
          <textarea
            id="feedback-message"
            ref={textRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={FEEDBACK_MAX_CHARS}
            rows={5}
            placeholder={current.placeholder}
            className="block w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink outline-none transition placeholder:text-muted/70 focus:border-blue focus:ring-2 focus:ring-blue/30"
          />
          {message.length > FEEDBACK_MAX_CHARS * 0.8 ? (
            <p className="mt-1 text-right text-[11.5px] text-muted">
              {message.length.toLocaleString()} / {FEEDBACK_MAX_CHARS.toLocaleString()}
            </p>
          ) : null}
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              void attach(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {shot ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.url} alt="Screenshot preview" className="h-14 w-20 shrink-0 rounded-lg border border-line bg-surface object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">Screenshot attached</p>
                <p className="text-[12px] text-muted">{Math.max(1, Math.round(shot.blob.size / 1024))} KB</p>
              </div>
              <button
                type="button"
                onClick={() => setShot(null)}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted transition hover:bg-surface hover:text-ink"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void attach(e.dataTransfer.files?.[0]);
              }}
              className={`flex w-full items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 text-left transition ${
                dragging ? "border-blue bg-surface-2" : "border-line hover:border-muted/50 hover:bg-surface-2"
              }`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                <Svg>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-4.5-4.5L5 21" />
                </Svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">
                  {processing ? "Preparing screenshot" : "Add a screenshot"}
                  <span className="font-normal text-muted"> (optional)</span>
                </span>
                <span className="block text-[12px] text-muted">Click, drop an image, or paste with ⌘V</span>
              </span>
            </button>
          )}
          {shotError ? <p className="mt-1.5 text-[12.5px] text-[#d14a3e]">{shotError}</p> : null}
        </div>

        {state && !state.ok ? (
          <p role="alert" className="rounded-xl border border-[#d14a3e] px-3.5 py-2.5 text-[13px] text-[#d14a3e]">
            {state.error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center">
        <nav aria-label="Help links" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:mr-auto">
          {HELP_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted transition hover:text-ink"
            >
              <Svg size={14}>{l.icon}</Svg>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || tooShort}
            className="rounded-full bg-blue px-5 py-2 text-sm font-semibold text-on-blue transition hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Sending" : "Send"}
          </button>
        </div>
      </div>
    </form>
  );
}
