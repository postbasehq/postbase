"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BotAvatar } from "@/components/postbots/BotAvatar";
import { createBot } from "@/app/(bots)/bots/actions";
import type { BotColor } from "@/lib/postbots/types";

export type PickerBot = { id: string; name: string; color: BotColor };

/** sessionStorage key for a first message the new bot's chat sends once it opens. */
export const firstMessageKey = (botId: string) => `pb:first-message:${botId}`;

/**
 * "+": start a chat. "To:" picks who it's with: an existing bot (opens its
 * chat) or a new one, named whatever is typed there. Writing a message below
 * makes the new bot and sends it that message as its first job.
 */
export function NewChat({ bots }: { bots: PickerBot[] }) {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toRef = useRef<HTMLInputElement>(null);

  const q = to.trim();
  const matches = useMemo(() => {
    const lq = q.toLowerCase();
    return lq ? bots.filter((b) => b.name.toLowerCase().includes(lq)) : bots;
  }, [bots, q]);
  // Row 0 is always "create"; the matching bots follow.
  const rows = matches.length + 1;
  const exact = matches.find((b) => b.name.toLowerCase() === q.toLowerCase());

  useEffect(() => setActive(0), [q]);

  function make(firstMessage?: string) {
    setError(null);
    start(async () => {
      let res: { error: string } | { id: string };
      try {
        res = await createBot({ name: q || undefined, greet: !firstMessage });
      } catch {
        // Usually a lapsed sign-in: reloading sends them to sign in again.
        window.location.reload();
        return;
      }
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (firstMessage) {
        try {
          sessionStorage.setItem(firstMessageKey(res.id), firstMessage);
        } catch {
          // Storage blocked: the chat opens without it, and they can send it again.
        }
      }
      router.push(`/bots/${res.id}`);
    });
  }

  function choose(i: number) {
    if (i === 0) make();
    else router.push(`/bots/${matches[i - 1].id}`);
  }

  useEffect(() => {
    // ⌘1-9 picks a row, like the numbers beside them.
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || pending) return;
      const n = Number(e.key);
      if (n >= 1 && n <= Math.min(9, rows)) {
        e.preventDefault();
        choose(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line pl-14 pr-3 md:pl-6">
        <label htmlFor="new-chat-to" className="shrink-0 text-[15px] text-muted">
          To:
        </label>
        <input
          ref={toRef}
          id="new-chat-to"
          autoFocus
          autoComplete="off"
          value={to}
          maxLength={40}
          onChange={(e) => {
            setTo(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => (a + 1) % rows);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + rows) % rows);
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              choose(active);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Start a chat with a bot, or name a new one"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 md:px-6">
        {open ? (
          <div role="listbox" aria-label="Start a chat with" className="mt-3 max-w-xl rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
            <PickerRow
              index={0}
              active={active === 0}
              onHover={setActive}
              onPick={choose}
              disabled={pending}
              icon={
                <span className="flex size-[26px] items-center justify-center rounded-full bg-surface-2 text-muted">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              }
              label={pending ? "Making your bot" : q && !exact ? `Create a bot called “${q}”` : "Create a new bot"}
            />
            {matches.map((b, i) => (
              <PickerRow
                key={b.id}
                index={i + 1}
                active={active === i + 1}
                onHover={setActive}
                onPick={choose}
                disabled={pending}
                icon={<BotAvatar color={b.color} size={26} />}
                label={b.name}
              />
            ))}
          </div>
        ) : null}
        {error ? <p className="mt-3 max-w-xl px-1 text-sm" style={{ color: "#d14a3e" }}>{error}</p> : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = message.trim();
          if (t && !pending) make(t);
        }}
        className="mx-auto mb-3 flex w-full max-w-4xl shrink-0 items-center gap-2 px-4"
      >
        <div className="flex min-w-0 flex-1 items-center rounded-full border border-line bg-surface pl-5 pr-1.5 shadow-sm focus-within:border-blue">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setOpen(false)}
            placeholder={q && !exact ? `Message ${q}` : "Tell a new bot what to do"}
            maxLength={4000}
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={pending || !message.trim()}
            aria-label="Send"
            className="flex size-9 items-center justify-center rounded-full bg-blue text-on-blue transition disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function PickerRow({
  index,
  active,
  onHover,
  onPick,
  disabled,
  icon,
  label,
}: {
  index: number;
  active: boolean;
  onHover: (i: number) => void;
  onPick: (i: number) => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      disabled={disabled}
      onMouseEnter={() => onHover(index)}
      // Keep focus in "To:" so the keyboard keeps working.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick(index)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition disabled:opacity-60 ${active ? "bg-surface-2" : ""}`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{label}</span>
      {index < 9 ? (
        <span className="flex shrink-0 gap-1 text-[11px] text-muted" aria-hidden>
          <kbd className="rounded border border-line px-1.5 py-0.5 font-sans">⌘</kbd>
          <kbd className="rounded border border-line px-1.5 py-0.5 font-sans">{index + 1}</kbd>
        </span>
      ) : null}
    </button>
  );
}
