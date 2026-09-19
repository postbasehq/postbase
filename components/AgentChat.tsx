"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { marked } from "marked";
import { AgentSparkIcon } from "@/components/AgentSparkIcon";
import { AgentPostsList } from "@/components/AgentPostsList";
import { AgentModelSelector } from "@/components/AgentModelSelector";
import { AgentMentionMenu } from "@/components/AgentMentionMenu";
import { AgentChannelMenu } from "@/components/AgentChannelMenu";
import { AgentComposerInput, type AgentComposerHandle } from "@/components/AgentComposerInput";
import { AGENT_MODELS, DEFAULT_MODEL_ID } from "@/lib/agent/models";
import type { AgentPostRow } from "@/lib/agent/tools";
import { BRAND_GLASS } from "@/lib/glass";
import type { AgentList } from "@/lib/agent/tools";
import { uploadAgentImage } from "@/app/(app)/agent/upload-actions";
import { agentStore, type AgentProposal } from "@/lib/agent/ui-store";
import {
  listConversations,
  getConversation,
  renameConversation,
  deleteConversation,
  type ConversationSummary,
} from "@/app/(app)/agent/history-actions";

export type AgentChannel = { id: string; platform: string; handle: string | null };

type Attachment = { url: string; type: string };

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
  modelsReady = { anthropic: true, openai: false },
}: {
  channels: AgentChannel[];
  conversations?: ConversationSummary[];
  remaining?: number | null;
  limit?: number | null;
  modelsReady?: { anthropic: boolean; openai: boolean };
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(initialRemaining ?? null);
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    initialConversations ?? [],
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionKind, setMentionKind] = useState<"slash" | "at">("slash");
  const [mentionQuery, setMentionQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Remember the picked model per-viewer (falling back to a configured one).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pb_agent_model");
      if (saved && AGENT_MODELS.some((m) => m.id === saved)) setModel(saved);
    } catch {
      // ignore
    }
  }, []);
  const changeModel = (id: string) => {
    setModel(id);
    try {
      localStorage.setItem("pb_agent_model", id);
    } catch {
      // ignore
    }
  };
  // Start each visit with no dock, and clear it when leaving /agent so a stale
  // proposal doesn't linger for the next visit.
  useEffect(() => {
    agentStore.clearProposal();
    return () => agentStore.clearProposal();
  }, []);

  const editorRef = useRef<AgentComposerHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mentionOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) setMentionOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [mentionOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = Math.max(0, 4 - attachments.length);
    const picked = Array.from(files).slice(0, room);
    if (picked.length === 0) return;
    setUploading(true);
    for (const file of picked) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadAgentImage(fd);
      if (res.ok) setAttachments((prev) => [...prev, { url: res.url, type: res.type }]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const insertPrompt = (p: string) => editorRef.current?.setText(p);

  const onTrigger = (kind: "@" | "/" | null, query: string) => {
    if (kind) {
      setMentionOpen(true);
      setMentionKind(kind === "@" ? "at" : "slash");
      setMentionQuery(query);
    } else if (mentionOpen) {
      setMentionOpen(false);
      setMentionQuery("");
    }
  };

  const addChannel = (channel: AgentChannel) => {
    const handle = `@${(channel.handle ?? channel.platform).replace(/^@/, "")}`;
    editorRef.current?.insertMention({ kind: "@", label: handle, value: handle, platforms: [channel.platform] });
    setMentionOpen(false);
    setMentionQuery("");
  };

  const addContext = (post: AgentPostRow) => {
    const body = post.body || "(empty draft)";
    const label = body.length > 28 ? `${body.slice(0, 28)}…` : body;
    editorRef.current?.insertMention({
      kind: "/",
      label,
      value: body,
      platforms: [...new Set(post.channels.map((c) => c.platform))],
    });
    setMentionOpen(false);
    setMentionQuery("");
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
    agentStore.clearProposal();
  }, []);

  const openConversation = useCallback(
    async (id: string) => {
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
      if (lastProposal) agentStore.restoreProposal(lastProposal as AgentProposal, channels);
      else agentStore.clearProposal();
    },
    [channels],
  );

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
      const atts = attachments;
      if ((!clean && atts.length === 0) || busy || uploading) return;
      if (remaining !== null && remaining <= 0) return;
      setInput("");
      editorRef.current?.clear();
      setAttachments([]);
      setMentionOpen(false);
      setBusy(true);

      const apiText = clean;
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const userMsg: Msg = {
        id: uid(),
        role: "user",
        content: clean,
        attachments: atts.length ? atts : undefined,
      };
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
            messages: [...history, { role: "user", content: apiText }],
            attachments: atts,
            model,
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
              agentStore.setProposal(data.proposal as AgentProposal, channels);
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
    [busy, uploading, attachments, model, channels, messages, remaining, conversationId, refreshConversations],
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
                <MessageRow key={m.id} msg={m} onOpenProposal={() => agentStore.openProposal()} />
              ))}
            </div>
          )}
        </div>

        <div ref={composerRef} className="relative mx-auto w-full max-w-2xl pt-3">
          {mentionOpen ? (
            <div className="absolute bottom-full left-0 z-30 mb-2 w-full max-w-sm">
              {mentionKind === "at" ? (
                <AgentChannelMenu
                  channels={channels}
                  query={mentionQuery}
                  onPick={addChannel}
                  onClose={() => setMentionOpen(false)}
                />
              ) : (
                <AgentMentionMenu query={mentionQuery} onPick={addContext} onClose={() => setMentionOpen(false)} />
              )}
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            style={BRAND_GLASS.style}
            className={`rounded-2xl transition focus-within:border-blue/60 ${BRAND_GLASS.className}`}
          >
            {/* status banner — clips onto the top while the agent works */}
            {busyStatus ? (
              <div className="flex items-center gap-2 rounded-t-2xl border-b border-line bg-blue-soft px-4 py-2">
                <AgentSparkIcon size={16} animated className="text-blue-ink" />
                <span className="agent-shimmer text-[13px] font-medium">{busyStatus}</span>
              </div>
            ) : null}

            {/* attached images */}
            {attachments.length > 0 || uploading ? (
              <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
                {attachments.map((a, i) => (
                  <div key={i} className="group relative size-14 overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Remove image"
                      className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {uploading ? (
                  <div className="flex size-14 items-center justify-center rounded-lg border border-dashed border-line text-[10px] text-muted">
                    Uploading…
                  </div>
                ) : null}
              </div>
            ) : null}

            <AgentComposerInput
              ref={editorRef}
              disabled={outOfQuota}
              placeholder={
                outOfQuota
                  ? "You're out of agent messages this month"
                  : "Ask the agent to draft or schedule a post…"
              }
              className="max-h-48 min-h-[56px] w-full overflow-y-auto bg-transparent px-4 pt-3.5 text-sm text-ink outline-none disabled:opacity-60"
              onChange={setInput}
              onSubmit={(t) => send(t)}
              onTrigger={onTrigger}
              onEscape={() => setMentionOpen(false)}
            />

            {/* toolbar: borderless icons left; model + send right */}
            <div className="flex items-center gap-0.5 px-2.5 pb-2.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={outOfQuota || attachments.length >= 4}
                aria-label="Attach image"
                title="Attach image"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49" />
                </svg>
              </button>
              <div className="ml-0.5 flex items-center gap-0.5 rounded-full bg-surface-2 p-1 ring-1 ring-line/60">
                {QUICK_ACTIONS.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    disabled={outOfQuota}
                    onClick={() => insertPrompt(q.prompt)}
                    aria-label={q.label}
                    title={q.label}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:-translate-y-px hover:bg-surface hover:text-blue-ink hover:shadow-sm disabled:opacity-40"
                  >
                    {q.icon}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-1">
                <AgentModelSelector value={model} onChange={changeModel} ready={modelsReady} />
                <button
                  type="submit"
                  disabled={busy || uploading || (!input.trim() && attachments.length === 0) || outOfQuota}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue text-on-blue transition disabled:opacity-40"
                  aria-label="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
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
      <div className="flex flex-col items-end gap-1.5">
        {msg.attachments && msg.attachments.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            {msg.attachments.map((a, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={a.url}
                alt=""
                className="size-20 rounded-xl border border-line object-cover"
              />
            ))}
          </div>
        ) : null}
        {msg.content ? (
          <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-blue px-4 py-2.5 text-sm text-on-blue">
            {msg.content}
          </div>
        ) : null}
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
