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

export type AgentChannel = { id: string; platform: string; handle: string | null };
export type AgentProposal = {
  body: string;
  thread: string[];
  channelIds: string[];
  scheduledAt: string | null;
  media: { url: string; type: string }[];
  variants?: Record<string, string>;
};
type ProposalSnapshot = {
  proposal: AgentProposal | null;
  channels: AgentChannel[];
  key: number;
  open: boolean;
};

const emptySnapshot: Snapshot = { conversations: [], activeId: null };
const noop: Actions = { open() {}, newChat() {}, rename() {}, remove() {} };
const emptyProposal: ProposalSnapshot = { proposal: null, channels: [], key: 0, open: false };

let snapshot: Snapshot = emptySnapshot;
let proposalSnapshot: ProposalSnapshot = emptyProposal;
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

  // ── Proposal dock bridge ─────────────────────────────────────────
  getProposal() {
    return proposalSnapshot;
  },
  /** A fresh proposal from the agent — opens the dock. */
  setProposal(proposal: AgentProposal, channels: AgentChannel[]) {
    proposalSnapshot = { proposal, channels, key: proposalSnapshot.key + 1, open: true };
    emit();
  },
  /** A proposal restored from history — kept closed until the user opens it. */
  restoreProposal(proposal: AgentProposal, channels: AgentChannel[]) {
    proposalSnapshot = { proposal, channels, key: proposalSnapshot.key + 1, open: false };
    emit();
  },
  openProposal() {
    if (proposalSnapshot.proposal && !proposalSnapshot.open) {
      proposalSnapshot = { ...proposalSnapshot, open: true };
      emit();
    }
  },
  closeProposal() {
    if (proposalSnapshot.open) {
      proposalSnapshot = { ...proposalSnapshot, open: false };
      emit();
    }
  },
  clearProposal() {
    if (proposalSnapshot.proposal || proposalSnapshot.open) {
      proposalSnapshot = { proposal: null, channels: [], key: proposalSnapshot.key, open: false };
      emit();
    }
  },
};

export function useAgentConversations(): Snapshot {
  return useSyncExternalStore(agentStore.subscribe, agentStore.getSnapshot, () => emptySnapshot);
}

export function useAgentProposal(): ProposalSnapshot {
  return useSyncExternalStore(agentStore.subscribe, agentStore.getProposal, () => emptyProposal);
}
