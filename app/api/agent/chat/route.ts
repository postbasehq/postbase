import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { getCurrentOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { atAgentLimit, recordAgentMessage } from "@/lib/billing-guard";
import { AGENT_MODEL, MAX_TOOL_ROUNDS, MAX_OUTPUT_TOKENS, systemPrompt } from "@/lib/agent/config";
import { AGENT_TOOLS, runAgentTool, type PostProposal } from "@/lib/agent/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

type ClientMessage = { role: "user" | "assistant"; content: string };

const enc = new TextEncoder();
const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
const titleFrom = (text: string) => {
  const t = text.trim().replace(/\s+/g, " ");
  return (t.length > 60 ? `${t.slice(0, 60)}…` : t) || "New chat";
};

export async function POST(req: Request) {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return new Response(JSON.stringify({ error: "No workspace found." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "The agent isn't configured yet (ANTHROPIC_API_KEY missing)." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  type Attachment = { url: string; type: string };
  let history: ClientMessage[] = [];
  let conversationId: string | null = null;
  let attachments: Attachment[] = [];
  try {
    const body = (await req.json()) as {
      messages?: ClientMessage[];
      conversationId?: string;
      attachments?: Attachment[];
    };
    history = (body.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-20);
    conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
    attachments = (body.attachments ?? [])
      .filter((a) => a && typeof a.url === "string" && typeof a.type === "string" && a.type.startsWith("image/"))
      .slice(0, 4);
  } catch {
    return new Response(JSON.stringify({ error: "Bad request." }), { status: 400 });
  }
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return new Response(JSON.stringify({ error: "Expected a user message." }), { status: 400 });
  }
  const userText = history[history.length - 1].content;

  // Meter usage: gate on the org's monthly message quota, then count this turn.
  // Uses the service role so the count can't be tampered with client-side.
  const admin = createAdminClient();
  if (await atAgentLimit(admin, orgId)) {
    return new Response(
      JSON.stringify({
        error: "You've used all your AI agent messages for this month. Upgrade your plan for more.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }
  await recordAgentMessage(admin, orgId);

  // Resolve (or create) the conversation this turn belongs to, then persist the
  // user message. Verify an incoming id belongs to this org before trusting it.
  let title = "New chat";
  if (conversationId) {
    const { data: convo } = await admin
      .from("agent_conversations")
      .select("id, title")
      .eq("id", conversationId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (convo) title = convo.title;
    else conversationId = null;
  }
  if (!conversationId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    title = titleFrom(userText);
    const { data: created } = await admin
      .from("agent_conversations")
      .insert({ org_id: orgId, author_id: user?.id ?? null, title })
      .select("id")
      .single();
    conversationId = created?.id ?? null;
  }
  if (conversationId) {
    await admin
      .from("agent_chat_messages")
      .insert({ conversation_id: conversationId, org_id: orgId, role: "user", content: userText });
  }
  const convoId = conversationId;

  const tz = (await cookies()).get("pb_tz")?.value;
  const timezone = tz ? decodeURIComponent(tz) : "UTC";
  const system = systemPrompt({ now: new Date(), timezone });

  const anthropic = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Give Claude vision on the images the user attached this turn by rebuilding
  // the last user message as text + image blocks.
  if (attachments.length > 0 && messages.length > 0) {
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (userText.trim()) blocks.push({ type: "text", text: userText });
    for (const a of attachments) {
      blocks.push({ type: "image", source: { type: "url", url: a.url } });
    }
    messages[messages.length - 1] = { role: "user", content: blocks };
  }

  let assistantText = "";
  let latestProposal: PostProposal | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(sse(obj));
      try {
        send({ type: "meta", conversationId: convoId, title });

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const run = anthropic.messages.stream({
            model: AGENT_MODEL,
            max_tokens: MAX_OUTPUT_TOKENS,
            system,
            tools: AGENT_TOOLS,
            messages,
          });

          run.on("text", (delta) => {
            assistantText += delta;
            send({ type: "token", text: delta });
          });

          const final = await run.finalMessage();
          messages.push({ role: "assistant", content: final.content });

          const toolUses = final.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );
          if (final.stop_reason !== "tool_use" || toolUses.length === 0) break;

          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            send({ type: "tool", name: tu.name });
            let out;
            try {
              out = await runAgentTool(orgId, tu.name, (tu.input ?? {}) as Record<string, unknown>);
            } catch (e) {
              out = { forModel: e instanceof Error ? e.message : "Tool failed." };
            }
            if (out.proposal) {
              // Fold this turn's uploaded images into the proposal, deduped by url.
              if (attachments.length > 0) {
                const seen = new Set(out.proposal.media.map((m) => m.url));
                for (const a of attachments) {
                  if (!seen.has(a.url)) out.proposal.media.push({ url: a.url, type: a.type });
                }
              }
              latestProposal = out.proposal;
              send({ type: "proposal", proposal: out.proposal });
            }
            if (out.list) send({ type: "list", list: out.list });
            results.push({ type: "tool_result", tool_use_id: tu.id, content: out.forModel });
          }
          messages.push({ role: "user", content: results });
        }
        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "The agent hit an error." });
      } finally {
        // Persist the assistant turn (best effort) and bump the conversation.
        if (convoId && (assistantText.trim() || latestProposal)) {
          try {
            await admin.from("agent_chat_messages").insert({
              conversation_id: convoId,
              org_id: orgId,
              role: "assistant",
              content: assistantText,
              proposal: latestProposal,
            });
            await admin
              .from("agent_conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", convoId);
          } catch {
            // Non-fatal: the reply already streamed to the user.
          }
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
