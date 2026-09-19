"use client";

import { useState } from "react";
import Link from "next/link";
import { agentStore, useAgentConversations } from "@/lib/agent/ui-store";
import { BRAND_GLASS } from "@/lib/glass";

/**
 * The app sidebar's contents while on /agent: a way back to the rest of
 * Postbase, a New chat button, and the conversation list. Reads the list +
 * active id from the shared store and dispatches actions back to AgentChat.
 */
export function AgentSidebar({ onShowNav }: { onShowNav?: () => void }) {
  const { conversations, activeId } = useAgentConversations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setDraft(title);
  };
  const commitRename = () => {
    if (editingId && draft.trim()) agentStore.rename(editingId, draft.trim());
    setEditingId(null);
  };

  return (
    <div
      style={BRAND_GLASS.style}
      className={`m-1.5 flex min-h-0 flex-1 flex-col rounded-2xl p-2.5 ${BRAND_GLASS.className}`}
    >
      <div className="flex items-center gap-1">
        <Link
          href="/calendar"
          className="flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Postbase
        </Link>
        {onShowNav ? (
          <button
            type="button"
            onClick={onShowNav}
            aria-label="Show menu"
            title="Show menu"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => agentStore.newChat()}
        className="mt-1 flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        New chat
      </button>

      <div className="mt-3 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted/70">
        Conversations
      </div>

      <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1 pb-1 [scrollbar-color:color-mix(in_oklab,var(--muted)_45%,transparent)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/40 [&::-webkit-scrollbar]:w-1.5">
        {conversations.length === 0 ? (
          <p className="px-3 py-3 text-[12px] leading-relaxed text-muted">
            No conversations yet. Start chatting and they&apos;ll appear here.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {conversations.map((c) => {
              const active = c.id === activeId;
              if (editingId === c.id) {
                return (
                  <input
                    key={c.id}
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full rounded-lg border border-blue bg-surface px-3 py-2 text-sm text-ink outline-none"
                  />
                );
              }
              return (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 rounded-lg pl-3 pr-1 text-sm transition-colors ${
                    active ? "bg-blue-soft text-blue-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => agentStore.open(c.id)}
                    className="min-w-0 flex-1 truncate py-2 text-left"
                    title={c.title}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => startRename(c.id, c.title)}
                    aria-label="Rename"
                    className="hidden size-6 shrink-0 items-center justify-center rounded-md text-muted transition hover:text-ink group-hover:flex"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this conversation?")) agentStore.remove(c.id);
                    }}
                    aria-label="Delete"
                    className="mr-1 hidden size-6 shrink-0 items-center justify-center rounded-md text-muted transition hover:text-ink group-hover:flex"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
