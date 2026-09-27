import Anthropic from "@anthropic-ai/sdk";
import { AGENT_TOOLS, type PostProposal } from "@/lib/agent/tools";
import { MAX_TOOL_ROUNDS, MAX_OUTPUT_TOKENS } from "@/lib/agent/config";
import { emptyUsage, execAgentTool, type RunOptions, type RunResult } from "@/lib/agent/run-shared";

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

  // Prompt caching. The system prompt ends with a per-request "## Context"
  // section (current time), so it's split: the static instructions (plus the
  // tools, which come before them) are cached, the context isn't.
  const cut = opts.system.indexOf("\n## Context");
  const system: Anthropic.TextBlockParam[] =
    cut > 0
      ? [
          { type: "text", text: opts.system.slice(0, cut), cache_control: { type: "ephemeral" } },
          { type: "text", text: opts.system.slice(cut) },
        ]
      : [{ type: "text", text: opts.system }];

  let assistantText = "";
  let latestProposal: PostProposal | null = null;
  const usage = emptyUsage();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const run = anthropic.messages.stream({
      model: opts.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      tools: AGENT_TOOLS,
      // Also cache the conversation so far: each tool round re-sends it.
      messages: withCacheBreakpoint(messages),
    });
    run.on("text", (delta) => {
      assistantText += delta;
      opts.send({ type: "token", text: delta });
    });

    const final = await run.finalMessage();
    usage.input += final.usage.input_tokens ?? 0;
    usage.output += final.usage.output_tokens ?? 0;
    usage.cacheRead += final.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += final.usage.cache_creation_input_tokens ?? 0;
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

  return { assistantText, latestProposal, usage };
}

/** Copy of the messages with a cache breakpoint on the last content block. */
function withCacheBreakpoint(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (messages.length === 0) return messages;
  const out = messages.slice();
  const last = out[out.length - 1];
  const blocks: Anthropic.ContentBlockParam[] =
    typeof last.content === "string" ? [{ type: "text", text: last.content }] : last.content.slice();
  if (blocks.length === 0) return messages;
  const end = blocks[blocks.length - 1];
  // Thinking blocks can't carry cache_control; skip rather than error.
  if (end.type === "thinking" || end.type === "redacted_thinking") return messages;
  blocks[blocks.length - 1] = { ...end, cache_control: { type: "ephemeral" } } as Anthropic.ContentBlockParam;
  out[out.length - 1] = { ...last, content: blocks };
  return out;
}
