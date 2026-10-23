import { runAgentTool, type PostProposal } from "@/lib/agent/tools";

/**
 * Shared bits between the provider-specific agent runners (Anthropic / OpenAI):
 * running a tool, folding this turn's uploaded images into a proposal, and
 * emitting the proposal/list SSE events. Keeps the two loops identical where it
 * counts so behaviour doesn't drift by provider.
 */
export type Attachment = { url: string; type: string };
export type SendFn = (obj: unknown) => void;
export type HistoryMessage = { role: "user" | "assistant"; content: string };

export type RunOptions = {
  apiKey: string;
  model: string;
  system: string;
  history: HistoryMessage[];
  userText: string;
  attachments: Attachment[];
  orgId: string;
  send: SendFn;
};

/** Tokens used across every round of one agent turn (for cost logging). */
export type TokenUsage = { input: number; output: number; cacheRead: number; cacheWrite: number };
export const emptyUsage = (): TokenUsage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });

export type RunResult = {
  assistantText: string;
  latestProposal: PostProposal | null;
  usage: TokenUsage;
};

/**
 * One turn's tool state. Cancelling has no confirm card, and post bodies the
 * agent reads (teammates', API clients') could ask it to cancel everything, so
 * a turn cancels at most one post.
 */
export type TurnState = { cancels: number };
export const MAX_CANCELS_PER_TURN = 1;

/** Run a tool, merge attachments into any proposal, emit its events. */
export async function execAgentTool(
  orgId: string,
  name: string,
  input: Record<string, unknown>,
  attachments: Attachment[],
  send: SendFn,
  turn: TurnState = { cancels: 0 },
): Promise<{ forModel: string; proposal: PostProposal | null }> {
  if (name === "cancel_post" && ++turn.cancels > MAX_CANCELS_PER_TURN) {
    return { forModel: "One cancel per message. Tell the user which post you cancelled and ask them to confirm the next one.", proposal: null };
  }
  let out;
  try {
    out = await runAgentTool(orgId, name, input);
  } catch (e) {
    out = { forModel: e instanceof Error ? e.message : "Tool failed." };
  }

  let proposal: PostProposal | null = null;
  if ("proposal" in out && out.proposal) {
    if (attachments.length > 0) {
      const seen = new Set(out.proposal.media.map((m) => m.url));
      for (const a of attachments) {
        if (!seen.has(a.url)) out.proposal.media.push({ url: a.url, type: a.type });
      }
    }
    proposal = out.proposal;
    send({ type: "proposal", proposal: out.proposal });
  }
  if ("list" in out && out.list) send({ type: "list", list: out.list });
  if ("image" in out && out.image) send({ type: "image", url: out.image.url });

  return { forModel: out.forModel, proposal };
}
