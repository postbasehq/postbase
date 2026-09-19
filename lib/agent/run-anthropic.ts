import Anthropic from "@anthropic-ai/sdk";
import { AGENT_TOOLS, type PostProposal } from "@/lib/agent/tools";
import { MAX_TOOL_ROUNDS, MAX_OUTPUT_TOKENS } from "@/lib/agent/config";
import { execAgentTool, type RunOptions, type RunResult } from "@/lib/agent/run-shared";

/** Claude tool-use loop: streams text, runs tools, streams proposal/list events. */
export async function runAnthropic(opts: RunOptions): Promise<RunResult> {
  const anthropic = new Anthropic({ apiKey: opts.apiKey });
  const messages: Anthropic.MessageParam[] = opts.history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Give Claude vision on this turn's attachments via image blocks.
  if (opts.attachments.length > 0 && messages.length > 0) {
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (opts.userText.trim()) blocks.push({ type: "text", text: opts.userText });
    for (const a of opts.attachments) {
      blocks.push({ type: "image", source: { type: "url", url: a.url } });
    }
    messages[messages.length - 1] = { role: "user", content: blocks };
  }

  let assistantText = "";
  let latestProposal: PostProposal | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const run = anthropic.messages.stream({
      model: opts.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: opts.system,
      tools: AGENT_TOOLS,
      messages,
    });
    run.on("text", (delta) => {
      assistantText += delta;
      opts.send({ type: "token", text: delta });
    });

    const final = await run.finalMessage();
    messages.push({ role: "assistant", content: final.content });

    const toolUses = final.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (final.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      opts.send({ type: "tool", name: tu.name });
      const { forModel, proposal } = await execAgentTool(
        opts.orgId,
        tu.name,
        (tu.input ?? {}) as Record<string, unknown>,
        opts.attachments,
        opts.send,
      );
      if (proposal) latestProposal = proposal;
      results.push({ type: "tool_result", tool_use_id: tu.id, content: forModel });
    }
    messages.push({ role: "user", content: results });
  }

  return { assistantText, latestProposal };
}
