"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { marked } from "marked";
import { PostPreview } from "@/components/PostPreview";
import { BrandTile } from "@/components/BrandTile";
import { AgentSparkIcon } from "@/components/AgentSparkIcon";
import { AgentPostsList } from "@/components/AgentPostsList";
import type { AgentList } from "@/lib/agent/tools";
import { scheduleProposedPost, type ConfirmProposal } from "@/app/(app)/agent/confirm-actions";
import { agentStore } from "@/lib/agent/ui-store";
import {
  listConversations,
  getConversation,
  renameConversation,
  deleteConversation,
  type ConversationSummary,
} from "@/app/(app)/agent/history-actions";

export type AgentChannel = { id: string; platform: string; handle: string | null };

type Proposal = {
  body: string;
  thread: string[];
  channelIds: string[];
  scheduledAt: string | null;
  media: { url: string; type: string }[];
};

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  producedProposal?: boolean;
  list?: AgentList | null;
  toolNote?: string | null;
};

const uid = () => Math.random().toString(36).slice(2);

const SUGGESTIONS = [
  "Draft a LinkedIn post announcing our new feature",
  "Schedule a tweet for tomorrow at 9am",
  "What do I have scheduled this week?",
  "Write a 3-tweet thread with tips for founders",
];

// Quick-intent chips in the composer toolbar — they prefill the box, not send.
const ic = (children: React.ReactNode) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
const QUICK_ACTIONS: { label: string; prompt: string; icon: React.ReactNode }[] = [
  {
    label: "Draft",
    prompt: "Draft a post about ",
    icon: ic(<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>),
  },
  {
    label: "Schedule",
    prompt: "Schedule a post for ",
    icon: ic(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  },
  {
    label: "Ideas",
    prompt: "Give me 3 post ideas about ",
    icon: ic(<><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" /></>),
  },
];

export function AgentChat({
  channels,
  conversations: initialConversations,
  remaining: initialRemaining,
  limit,
}: {
  channels: AgentChannel[];
  conversations?: ConversationSummary[];
  remaining?: number | null;
  limit?: number | null;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(initialRemaining ?? null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [proposalKey, setProposalKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    initialConversations ?? [],
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const insertPrompt = (p: string) => {
    setInput(p);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  };

  // Publish the conversation list + active id to the shared store so the app
  // sidebar (rendered in the layout) can show and drive them.
  useEffect(() => agentStore.setConversations(conversations), [conversations]);
  useEffect(() => agentStore.setActiveId(conversationId), [conversationId]);

  const refreshConversations = useCallback(() => {
    listConversations()
      .then(setConversations)
      .catch(() => {});
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setProposal(null);
    setDrawerOpen(false);
  }, []);

  const openConversation = useCallback(async (id: string) => {
    setConversationId(id);
    const stored = await getConversation(id);
    const mapped: Msg[] = stored.map((m) => ({
      id: uid(),
      role: m.role,
      content: m.content,
      producedProposal: !!m.proposal,
    }));
    const lastProposal = [...stored].reverse().find((m) => m.proposal)?.proposal ?? null;
    setMessages(mapped);
    setProposal((lastProposal as Proposal) ?? null);
    setProposalKey((k) => k + 1);
    setDrawerOpen(false);
  }, []);

  const removeConversation = useCallback(
    async (id: string) => {
      const res = await deleteConversation(id);
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (id === conversationId) newChat();
      }
    },
    [conversationId, newChat],
  );

  const renameConvo = useCallback(async (id: string, title: string) => {
    const res = await renameConversation(id, title);
    if (res.ok) {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    }
  }, []);

  useEffect(
    () =>
      agentStore.registerActions({
        open: openConversation,
        newChat,
        rename: renameConvo,
        remove: removeConversation,
      }),
    [openConversation, newChat, renameConvo, removeConversation],
  );

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || busy) return;
      if (remaining !== null && remaining <= 0) return;
      setInput("");
      setBusy(true);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const userMsg: Msg = { id: uid(), role: "user", content: clean };
      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", toolNote: null },
      ]);

      const patch = (fn: (m: Msg) => Msg) =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

      let createdNew = false;
      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            messages: [...history, { role: "user", content: clean }],
          }),
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 429) setRemaining(0);
          patch((m) => ({ ...m, content: err.error || "The agent is unavailable right now." }));
          return;
        }
        setRemaining((r) => (r === null ? r : Math.max(0, r - 1)));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const evt of events) {
            const line = evt.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            let data: Record<string, unknown>;
            try {
              data = JSON.parse(line.slice(6));
            } catch {
              continue;
            }
            if (data.type === "meta") {
              if (data.conversationId && data.conversationId !== conversationId) {
                createdNew = true;
                setConversationId(String(data.conversationId));
              }
            } else if (data.type === "token") {
              patch((m) => ({ ...m, content: m.content + String(data.text ?? ""), toolNote: null }));
            } else if (data.type === "tool") {
              patch((m) => ({ ...m, toolNote: toolLabel(String(data.name)) }));
            } else if (data.type === "proposal") {
              setProposal(data.proposal as Proposal);
              setProposalKey((k) => k + 1);
              setDrawerOpen(true);
              patch((m) => ({ ...m, producedProposal: true, toolNote: null }));
            } else if (data.type === "list") {
              patch((m) => ({ ...m, list: data.list as AgentList, toolNote: null }));
            } else if (data.type === "error") {
              patch((m) => ({ ...m, content: m.content + `\n\n_${String(data.message)}_`, toolNote: null }));
            }
          }
        }
      } catch {
        patch((m) => ({ ...m, content: m.content || "Something went wrong reaching the agent." }));
      } finally {
        setBusy(false);
        // Refresh the rail so a new thread appears and titles/ordering update.
        if (createdNew || conversationId) refreshConversations();
      }
    },
    [busy, messages, remaining, conversationId, refreshConversations],
  );

  const outOfQuota = remaining !== null && remaining <= 0;
  const last = messages[messages.length - 1];
  const busyStatus = busy
    ? last?.role === "assistant" && last.toolNote
      ? last.toolNote
      : last?.role === "assistant" && last.content
        ? "Responding…"
        : "Thinking…"
    : null;

  return (
    <div className="flex h-full gap-4">
      {/* ── Chat column ──────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState channels={channels} onPick={send} />
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-5 py-4">
              {messages.map((m) => (
                <MessageRow key={m.id} msg={m} onOpenProposal={() => setDrawerOpen(true)} />
              ))}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-2xl pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition focus-within:border-blue focus-within:shadow-md"
          >
            {/* status banner — clips onto the top while the agent works */}
            {busyStatus ? (
              <div className="flex items-center gap-2 border-b border-line bg-blue-soft px-4 py-2">
                <AgentSparkIcon size={16} animated className="text-blue-ink" />
                <span className="agent-shimmer text-[13px] font-medium">{busyStatus}</span>
              </div>
            ) : null}

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              disabled={outOfQuota}
              placeholder={
                outOfQuota
                  ? "You're out of agent messages this month"
                  : "Ask the agent to draft or schedule a post…"
              }
              className="max-h-48 min-h-[56px] w-full resize-none bg-transparent px-4 pt-3.5 text-sm text-ink outline-none placeholder:text-muted disabled:opacity-60"
            />

            {/* toolbar: quick-intent chips + send */}
            <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={outOfQuota}
                  onClick={() => insertPrompt(q.prompt)}
                  className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-muted transition hover:border-blue hover:text-ink disabled:opacity-40"
                >
                  <span className="text-blue-ink">{q.icon}</span>
                  {q.label}
                </button>
              ))}
              <button
                type="submit"
                disabled={busy || !input.trim() || outOfQuota}
                className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue text-on-blue transition disabled:opacity-40"
                aria-label="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
                </svg>
              </button>
            </div>
          </form>
          <p className="px-2 pt-1.5 text-center text-[11px] text-muted">
            {remaining !== null && limit && remaining <= Math.max(5, Math.ceil(limit * 0.1)) ? (
              remaining <= 0 ? (
                <>
                  You&apos;re out of agent messages this month.{" "}
                  <Link href="/billing" className="font-medium text-blue">
                    Upgrade
                  </Link>{" "}
                  for more.
                </>
              ) : (
                <>
                  {remaining} agent message{remaining === 1 ? "" : "s"} left this month · nothing
                  publishes until you click Schedule.
                </>
              )
            ) : (
              "The agent drafts posts for you to review — nothing publishes until you click Schedule."
            )}
          </p>
        </div>
      </div>

      {/* ── Proposed-post side panel (only once a draft exists, lg+) ─ */}
      {proposal ? (
        <aside className="hidden w-[420px] shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2 lg:flex xl:w-[480px]">
          <ProposalPanel key={proposalKey} proposal={proposal} channels={channels} />
        </aside>
      ) : null}

      {/* ── Proposed-post drawer (slide-over, < lg) ──────────────── */}
      {drawerOpen && proposal ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-hidden border-l border-line bg-surface-2 shadow-2xl">
            <ProposalPanel
              key={proposalKey}
              proposal={proposal}
              channels={channels}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}

    </div>
  );
}

function toolLabel(name: string): string {
  switch (name) {
    case "list_channels":
      return "Checking your channels…";
    case "list_scheduled":
      return "Looking at your queue…";
    case "generate_image":
      return "Generating an image…";
    case "propose_post":
      return "Drafting a post…";
    case "cancel_post":
      return "Cancelling a post…";
    default:
      return "Working…";
  }
}

function MessageRow({ msg, onOpenProposal }: { msg: Msg; onOpenProposal: () => void }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-blue px-4 py-2.5 text-sm text-on-blue">
          {msg.content}
        </div>
      </div>
    );
  }
  return <AssistantRow msg={msg} onOpenProposal={onOpenProposal} />;
}

function AssistantRow({ msg, onOpenProposal }: { msg: Msg; onOpenProposal: () => void }) {
  const html = useMemo(
    () => (msg.content ? marked.parse(msg.content, { async: false }) : ""),
    [msg.content],
  );
  return (
    <div className="flex flex-col items-start gap-2">
      {msg.content ? (
        <div
          className="agent-prose max-w-none text-sm leading-relaxed text-ink"
          dangerouslySetInnerHTML={{ __html: html as string }}
        />
      ) : msg.toolNote ? (
        <div className="text-sm text-muted">{msg.toolNote}</div>
      ) : null}
      {msg.list ? <AgentPostsList list={msg.list} /> : null}
      {msg.producedProposal ? (
        <button
          type="button"
          onClick={onOpenProposal}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink transition hover:border-blue lg:hidden"
        >
          <span className="flex size-5 items-center justify-center rounded-md bg-blue text-on-blue">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </span>
          Review proposed post
          <span aria-hidden>→</span>
        </button>
      ) : null}
    </div>
  );
}

// ── Proposed-post panel: review + edit + schedule, stacked vertically ───────
function ProposalPanel({
  proposal,
  channels,
  onClose,
}: {
  proposal: Proposal;
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
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; status?: string } | null>(null);

  const media = proposal.media;
  const previewChannel =
    channels.find((c) => c.id === selected[0]) ?? channels.find((c) => c.id === proposal.channelIds[0]);

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
    <div className="flex h-full w-full flex-col">
      {/* header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-5 py-3.5">
        <span className="flex size-6 items-center justify-center rounded-md bg-blue text-on-blue">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </span>
        <span className="text-[13px] font-semibold text-ink">Proposed post</span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex size-7 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <span className="ml-auto text-[12px] text-muted">Review &amp; edit</span>
        )}
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
              <div className="pb-2 text-xs font-semibold text-muted">
                Channels
              </div>
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
                            ? "ring-2 ring-blue ring-offset-2 ring-offset-surface-2"
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
              {segments.map((seg, i) => (
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
              ))}
            </div>

            <div>
              <div className="pb-2 text-xs font-semibold text-muted">
                When
              </div>
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
                previewChannel ? (
                  <PostPreview
                    platform={previewChannel.platform}
                    handle={previewChannel.handle}
                    thread={segments}
                    media={media}
                    metrics={null}
                    publishedAt={when ? fromLocalInput(when) : null}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-muted">
                    Select a channel to preview.
                  </div>
                )
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

function EmptyState({ channels, onPick }: { channels: AgentChannel[]; onPick: (t: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 py-10 text-center">
      <AgentSparkIcon size={52} className="text-blue" />
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Postbase Agent</h2>
        <p className="pt-1 text-sm text-muted">
          Describe what you want to post and I&apos;ll draft it, add images, and queue it —
          {channels.length > 0 ? " ready for you to schedule." : " connect a channel to get started."}
        </p>
      </div>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-line bg-surface px-4 py-3 text-left text-[13px] text-ink transition hover:border-blue hover:bg-surface-2"
          >
            {s}
          </button>
        ))}
      </div>
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
