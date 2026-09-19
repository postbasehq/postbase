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

export type RunResult = { assistantText: string; latestProposal: PostProposal | null };

/** Run a tool, merge attachments into any proposal, emit its events. */
export async function execAgentTool(
  orgId: string,
  name: string,
  input: Record<string, unknown>,
  attachments: Attachment[],
  send: SendFn,
): Promise<{ forModel: string; proposal: PostProposal | null }> {
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

  return { forModel: out.forModel, proposal };
}
