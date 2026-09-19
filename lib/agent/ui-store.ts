import { useSyncExternalStore } from "react";
import type { ConversationSummary } from "@/app/(app)/agent/history-actions";

/**
 * Shared store bridging the AgentChat client component (which owns the chat
 * state) and the app sidebar (rendered in the layout), which on /agent shows
 * the conversation list instead of the nav. AgentChat publishes the list +
 * active id and registers the action handlers; the sidebar renders the snapshot
 * and dispatches actions. A module singleton avoids a context provider around
 * the whole authed layout.
 */

type Snapshot = { conversations: ConversationSummary[]; activeId: string | null };
type Actions = {
  open: (id: string) => void;
  newChat: () => void;
  rename: (id: string, title: string) => void;
  remove: (id: string) => void;
};

const emptySnapshot: Snapshot = { conversations: [], activeId: null };
const noop: Actions = { open() {}, newChat() {}, rename() {}, remove() {} };

let snapshot: Snapshot = emptySnapshot;
let actions: Actions = noop;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const agentStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot() {
    return snapshot;
  },
  setConversations(conversations: ConversationSummary[]) {
    snapshot = { ...snapshot, conversations };
    emit();
  },
  setActiveId(activeId: string | null) {
    if (snapshot.activeId === activeId) return;
    snapshot = { ...snapshot, activeId };
    emit();
  },
  registerActions(a: Actions) {
    actions = a;
    return () => {
      if (actions === a) actions = noop;
    };
  },
  // Stable dispatchers the sidebar can call regardless of what's registered.
  open: (id: string) => actions.open(id),
  newChat: () => actions.newChat(),
  rename: (id: string, title: string) => actions.rename(id, title),
  remove: (id: string) => actions.remove(id),
};

export function useAgentConversations(): Snapshot {
  return useSyncExternalStore(agentStore.subscribe, agentStore.getSnapshot, () => emptySnapshot);
}
