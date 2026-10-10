"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { renderSafeMarkdown } from "@/lib/safe-markdown";
import { BotAvatar } from "@/components/postbots/BotAvatar";
import { BrandTile } from "@/components/BrandTile";
import { botMessages, deleteBot, markBotRead, saveBotDraft } from "@/app/(bots)/bots/actions";
import {
  SOURCE_LABEL,
  type Bot,
  type BotCard,
  type BotMessage,
  type DraftCard,
  type FindingsCard,
  type QuestionCard,
} from "@/lib/postbots/types";

export type BotChannel = { id: string; platform: string; handle: string | null };

const BLUE = "#2b59d9";
const LETTERS = "ABCDE";

const TOOL_STATUS: Record<string, string> = {
  run_sweep: "is checking its sources",
  web_search: "is searching the web",
  save_listen_setup: "is setting up",
  set_status: "is updating its schedule",
  list_channels: "is looking at your channels",
  list_posts: "is looking at your posts",
  draft_post: "is drafting",
};

/** True after the first client render. Dates are formatted in the viewer's
 *  timezone and locale, which the server can't know, so they wait for this
 *  (otherwise the server's text and the browser's don't match on hydration). */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Server actions throw when the session lapses (the request is redirected to
 * sign-in, so the action gets a page back instead of its answer). For calls
 * made in the background, keep what's on screen instead of crashing the chat.
 */
async function quietly<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}

export function BotChat({
  bot: initialBot,
  initialMessages,
  channels,
}: {
  bot: Bot;
  initialMessages: BotMessage[];
  channels: BotChannel[];
}) {
  const router = useRouter();
  const [bot, setBot] = useState(initialBot);
  const [messages, setMessages] = useState<BotMessage[]>(initialMessages);
  const [pending, setPending] = useState<{ text: string; cards: BotCard[] } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  /** What the bot's face shows: thinking until it answers, working while it runs a tool. */
  const [activity, setActivity] = useState<"thinking" | "working" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  useEffect(() => {
    void quietly(() => markBotRead(bot.id));
  }, [bot.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending, status]);

  const lastUserIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") return i;
    return -1;
  }, [messages]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: t, cards: [], createdAt: new Date().toISOString() }]);
    setPending({ text: "", cards: [] });
    setStatus("is working");
    setActivity("thinking");
    let local = { text: "", cards: [] as BotCard[] };
    try {
      const res = await fetch(`/api/bots/${bot.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Try again.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          if (data.type === "token") {
            local = { ...local, text: local.text + String(data.text ?? "") };
            setStatus(null);
            setActivity("thinking");
          } else if (data.type === "card") {
            local = { ...local, cards: [...local.cards, data.card as BotCard] };
          } else if (data.type === "tool") {
            setStatus(TOOL_STATUS[String(data.name)] ?? "is working");
            setActivity("working");
          } else if (data.type === "flush") {
            const flushed = local;
            local = { text: "", cards: [] };
            if (flushed.text.trim() || flushed.cards.length) {
              setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "bot", content: flushed.text.trim(), cards: flushed.cards, createdAt: new Date().toISOString() }]);
            }
          } else if (data.type === "identity") {
            const name = String(data.name ?? "");
            if (name) setBot((cur) => ({ ...cur, name }));
            router.refresh();
          } else if (data.type === "refresh") {
            // A sweep posted its own message: show the stored chat so far.
            const fresh = await quietly(() => botMessages(bot.id));
            if (fresh) setMessages(fresh);
          } else if (data.type === "done") {
            const b = data.bot as { name?: string; status?: Bot["status"] } | undefined;
            if (b?.name) setBot((cur) => ({ ...cur, name: b.name!, status: b.status ?? cur.status }));
          } else if (data.type === "error") {
            setError(String(data.message ?? "The bot hit an error."));
          }
          setPending({ ...local });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setStatus(null);
      setActivity(null);
      setPending(null);
      const fresh = await quietly(() => botMessages(bot.id));
      if (fresh) setMessages(fresh);
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="relative flex h-16 shrink-0 items-center justify-center px-14">
        <span className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2 pr-4 shadow-sm">
          <BotAvatar color={bot.color} size={28} state={activity ?? "resting"} />
          <span className="font-display text-[15px] font-semibold text-ink">{bot.name}</span>
          {bot.status === "paused" ? (
            <span className="text-[12px] text-muted">Paused</span>
          ) : null}
        </span>
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Bot options"
            className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-line bg-surface p-1 shadow-lg">
              <button
                type="button"
                onClick={async () => {
                  setMenuOpen(false);
                  if (!confirm(`Delete ${bot.name}? This deletes the bot and its chat.`)) return;
                  try {
                    await deleteBot(bot.id);
                  } catch {
                    // Usually a lapsed sign-in: reloading sends them to sign in again.
                    window.location.reload();
                  }
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-2"
                style={{ color: "#d14a3e" }}
              >
                Delete {bot.name}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 pb-6 pt-2">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDay = !prev || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 3 * 3_600_000;
            const answer = messages.slice(i + 1).find((n) => n.role === "user")?.content ?? null;
            return (
              <div key={m.id} className="flex flex-col gap-2">
                {showDay ? <p className="h-11 py-3 text-center text-[13px] text-muted">{mounted ? dayLabel(m.createdAt) : null}</p> : null}
                <MessageView
                  message={m}
                  answer={answer}
                  live={i > lastUserIndex}
                  busy={busy}
                  dismissed={dismissed}
                  onDismiss={(key) => setDismissed((d) => new Set(d).add(key))}
                  onSend={send}
                  botId={bot.id}
                  channels={channels}
                />
              </div>
            );
          })}
          {pending && (pending.text || pending.cards.length) ? (
            <MessageView
              message={{ id: "pending", role: "bot", content: pending.text, cards: pending.cards, createdAt: "" }}
              answer={null}
              live={false}
              busy
              dismissed={dismissed}
              onDismiss={() => undefined}
              onSend={send}
              botId={bot.id}
              channels={channels}
            />
          ) : null}
          {status ? (
            <div className="flex items-center gap-2 px-1 py-1">
              <BotAvatar color={bot.color} size={26} state={activity ?? "thinking"} />
              <span className="agent-shimmer text-[13px] font-medium">
                {bot.name} {status}
              </span>
            </div>
          ) : null}
          {error ? (
            <p className="px-1 text-sm" style={{ color: "#d14a3e" }}>
              {error}
            </p>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mx-auto mb-3 flex w-full max-w-3xl shrink-0 items-center gap-2 px-4"
      >
        <div className="flex min-w-0 flex-1 items-center rounded-full border border-line bg-surface pl-5 pr-1.5 shadow-sm focus-within:border-blue">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${bot.name}`}
            maxLength={4000}
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex size-9 items-center justify-center rounded-full text-white transition disabled:opacity-40"
            style={{ background: BLUE }}
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

function MessageView({
  message,
  answer,
  live,
  busy,
  dismissed,
  onDismiss,
  onSend,
  botId,
  channels,
}: {
  message: BotMessage;
  /** The user's next message, which answers a question card. */
  answer: string | null;
  /** True for bot messages after the user's last message (their questions are open). */
  live: boolean;
  busy: boolean;
  dismissed: Set<string>;
  onDismiss: (key: string) => void;
  onSend: (text: string) => void;
  botId: string;
  channels: BotChannel[];
}) {
  const html = useMemo(() => (message.content ? renderSafeMarkdown(message.content) : ""), [message.content]);
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed text-white" style={{ background: BLUE }}>
          {message.content}
        </p>
      </div>
    );
  }
  return (
    <div className="flex max-w-[88%] flex-col gap-2 md:max-w-[80%]">
      {html ? (
        <div
          className="agent-prose rounded-3xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed text-ink"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
      {message.cards.map((card, ci) => {
        const key = `${message.id}:${ci}`;
        if (card.type === "question") {
          if (dismissed.has(key)) return null;
          return (
            <QuestionView
              key={key}
              card={card}
              answer={answer}
              open={live && !busy}
              onDismiss={() => onDismiss(key)}
              onSend={onSend}
            />
          );
        }
        if (card.type === "findings") return <FindingsView key={key} card={card} busy={busy} onSend={onSend} />;
        return <DraftView key={key} card={card} botId={botId} channels={channels} />;
      })}
    </div>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl bg-surface-2 p-4">{children}</div>;
}

function QuestionView({
  card,
  answer,
  open,
  onDismiss,
  onSend,
}: {
  card: QuestionCard;
  answer: string | null;
  open: boolean;
  onDismiss: () => void;
  onSend: (text: string) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [own, setOwn] = useState("");
  const chosen = answer ? card.options.filter((o) => answer.split(/,\s*|\s+and\s+/).includes(o)) : [];
  const answeredOther = answer !== null && chosen.length === 0;

  const choose = (o: string) => {
    if (!open) return;
    if (!card.multiSelect) return onSend(o);
    setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));
  };

  return (
    <CardShell>
      <div className="flex items-start gap-3">
        <p className="flex-1 text-[15px] font-semibold text-ink">{card.question}</p>
        {open ? (
          <button type="button" onClick={onDismiss} aria-label="Dismiss question" className="text-muted transition hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        ) : null}
      </div>
      {card.multiSelect && open ? <p className="mt-0.5 text-[13px] text-muted">Pick any that apply.</p> : null}
      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        {card.options.map((o, i) => {
          const on = open ? picked.includes(o) : chosen.includes(o);
          return (
            <button
              key={o}
              type="button"
              disabled={!open}
              onClick={() => choose(o)}
              className={`flex w-full items-center gap-3 border-line bg-surface px-3 py-3 text-left text-[15px] transition ${i ? "border-t" : ""} ${open ? "hover:bg-surface-2" : ""} ${!open && !on ? "text-muted" : "text-ink"}`}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-line text-[12px] font-medium text-muted">
                {LETTERS[i]}
              </span>
              <span className="flex-1">{o}</span>
              {on ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-label="Chosen">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (own.trim()) onSend(own);
            else if (picked.length) onSend(picked.join(", "));
          }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            value={own}
            onChange={(e) => setOwn(e.target.value)}
            placeholder="Type your own answer"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[15px] text-ink outline-none placeholder:text-muted focus:border-blue"
          />
          {card.multiSelect || own.trim() ? (
            <button
              type="submit"
              disabled={!own.trim() && picked.length === 0}
              className="h-11 shrink-0 rounded-xl px-4 font-display text-sm font-semibold text-white transition disabled:opacity-40"
              style={{ background: BLUE }}
            >
              Send
            </button>
          ) : null}
        </form>
      ) : answeredOther ? (
        <p className="mt-3 text-[13px] text-muted">You answered: {answer}</p>
      ) : null}
    </CardShell>
  );
}

function FindingsView({ card, busy, onSend }: { card: FindingsCard; busy: boolean; onSend: (text: string) => void }) {
  return (
    <CardShell>
      <ul className="flex flex-col gap-3">
        {card.items.map((f) => (
          <li key={f.url} className="flex gap-3">
            <span className="pt-0.5">
              <BrandTile platform={f.source} size={26} radius={7} />
            </span>
            <div className="min-w-0 flex-1">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                {f.title}
              </a>
              <p className="mt-0.5 text-[13px] text-muted">
                {SOURCE_LABEL[f.source]}
                {f.author ? ` · ${f.author}` : ""}
                {f.kind === "lead" ? " · Possible lead" : ""}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink">{f.why}</p>
              {f.action !== "none" ? (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onSend(
                        f.action === "reply"
                          ? `Draft a reply I could post to this: "${f.title}" (${f.url})`
                          : `Draft a post for my channels about this: "${f.title}" (${f.url})`,
                      )
                    }
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-surface-2 disabled:opacity-50"
                  >
                    {f.action === "reply" ? "Draft a reply" : "Draft a post"}
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

function DraftView({ card, botId, channels }: { card: DraftCard; botId: string; channels: BotChannel[] }) {
  const [body, setBody] = useState(card.body);
  const known = new Set(channels.map((c) => c.id));
  const [selected, setSelected] = useState<string[]>(card.channelIds.filter((id) => known.has(id)));
  const [state, setState] = useState<{ saving: boolean; saved: string | null; error: string | null }>({ saving: false, saved: null, error: null });
  const mounted = useMounted();
  const when = card.scheduledAt && mounted ? new Date(card.scheduledAt) : null;

  async function save(schedule: boolean) {
    setState({ saving: true, saved: null, error: null });
    const res = await quietly(() => saveBotDraft(botId, { body, channelIds: selected, scheduledAt: schedule ? card.scheduledAt : null }));
    if (!res) {
      setState({ saving: false, saved: null, error: "Couldn't reach Postbase. Refresh the page and try again." });
      return;
    }
    setState(res.ok ? { saving: false, saved: res.status, error: null } : { saving: false, saved: null, error: res.error });
  }

  return (
    <CardShell>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={Boolean(state.saved)}
        rows={Math.min(10, Math.max(3, body.split("\n").length + 1))}
        className="w-full resize-none rounded-2xl border border-line bg-surface p-3 text-[15px] leading-relaxed text-ink outline-none focus:border-blue"
      />
      {channels.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {channels.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                disabled={Boolean(state.saved)}
                onClick={() => setSelected((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))}
                className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[13px] transition ${on ? "border-ink text-ink" : "border-line text-muted"}`}
              >
                <BrandTile platform={c.platform} size={20} radius={10} />
                {c.handle ?? c.platform}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-muted">
          Connect a channel in{" "}
          <Link href="/channels" className="underline underline-offset-4">
            Postbase
          </Link>{" "}
          to save this as a post.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {state.error ? (
          <p className="mr-auto text-[13px]" style={{ color: "#d14a3e" }}>
            {state.error}
          </p>
        ) : null}
        {state.saved ? (
          <p className="text-[13px] text-muted">
            {state.saved === "scheduled" ? "Scheduled in " : "Saved to drafts in "}
            <Link href={state.saved === "scheduled" ? "/calendar" : "/drafts"} className="underline underline-offset-4">
              Postbase
            </Link>
          </p>
        ) : (
          <>
            <button
              type="button"
              disabled={state.saving || !body.trim() || selected.length === 0}
              onClick={() => save(false)}
              className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-surface-2 disabled:opacity-50"
            >
              Save as draft
            </button>
            {when ? (
              <button
                type="button"
                disabled={state.saving || !body.trim() || selected.length === 0}
                onClick={() => save(true)}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition disabled:opacity-50"
                style={{ background: BLUE }}
              >
                Schedule for {when.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
              </button>
            ) : null}
          </>
        )}
      </div>
    </CardShell>
  );
}
