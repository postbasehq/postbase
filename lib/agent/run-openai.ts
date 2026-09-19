import OpenAI from "openai";
import { AGENT_TOOLS, type PostProposal } from "@/lib/agent/tools";
import { MAX_TOOL_ROUNDS } from "@/lib/agent/config";
import { execAgentTool, type RunOptions, type RunResult } from "@/lib/agent/run-shared";

/** GPT tool-calling loop: mirrors the Anthropic runner over the OpenAI API. */
export async function runOpenAI(opts: RunOptions): Promise<RunResult> {
  const openai = new OpenAI({ apiKey: opts.apiKey });

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = AGENT_TOOLS.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    ...opts.history.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Give GPT vision on this turn's attachments via image_url parts.
  if (opts.attachments.length > 0 && messages.length > 1) {
    const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    if (opts.userText.trim()) parts.push({ type: "text", text: opts.userText });
    for (const a of opts.attachments) {
      parts.push({ type: "image_url", image_url: { url: a.url } });
    }
    messages[messages.length - 1] = { role: "user", content: parts };
  }

  let assistantText = "";
  let latestProposal: PostProposal | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = await openai.chat.completions.create({
      model: opts.model,
      messages,
      tools,
      stream: true,
    });

    let content = "";
    const calls: Record<number, { id: string; name: string; args: string }> = {};
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        content += delta.content;
        assistantText += delta.content;
        opts.send({ type: "token", text: delta.content });
      }
      for (const tc of delta?.tool_calls ?? []) {
        const cur = (calls[tc.index] ??= { id: "", name: "", args: "" });
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
      }
    }

    const toolCalls = Object.values(calls);
    if (toolCalls.length === 0) break;

    messages.push({
      role: "assistant",
      content: content || null,
      tool_calls: toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.args || "{}" },
      })),
    });

    for (const c of toolCalls) {
      opts.send({ type: "tool", name: c.name });
      let input: Record<string, unknown> = {};
      try {
        input = c.args ? (JSON.parse(c.args) as Record<string, unknown>) : {};
      } catch {
        input = {};
      }
      const { forModel, proposal } = await execAgentTool(
        opts.orgId,
        c.name,
        input,
        opts.attachments,
        opts.send,
      );
      if (proposal) latestProposal = proposal;
      messages.push({ role: "tool", tool_call_id: c.id, content: forModel });
    }
  }

  return { assistantText, latestProposal };
}
