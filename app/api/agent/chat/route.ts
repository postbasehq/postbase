import { cookies } from "next/headers";
import { getCurrentOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { atAgentLimit, recordAgentMessage, aiUsage } from "@/lib/billing-guard";
import { higgsfieldConfigured } from "@/lib/higgsfield";
import { systemPrompt } from "@/lib/agent/config";
import { getModel, DEFAULT_MODEL_ID } from "@/lib/agent/models";
import { runAnthropic } from "@/lib/agent/run-anthropic";
import { runOpenAI } from "@/lib/agent/run-openai";
import type { PostProposal } from "@/lib/agent/tools";

export const runtime = "nodejs";
// Image generation can sit in Higgsfield's queue for a while before running, so
// give the function real headroom — the image poller waits up to ~110s.
export const maxDuration = 120;

type ClientMessage = { role: "user" | "assistant"; content: string };
type Attachment = { url: string; type: string };

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

  let history: ClientMessage[] = [];
  let conversationId: string | null = null;
  let attachments: Attachment[] = [];
  let modelId: string | null = null;
  try {
    const body = (await req.json()) as {
      messages?: ClientMessage[];
      conversationId?: string;
      attachments?: Attachment[];
      model?: string;
    };
    history = (body.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-20);
    conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
    attachments = (body.attachments ?? [])
      .filter((a) => a && typeof a.url === "string" && typeof a.type === "string" && a.type.startsWith("image/"))
      .slice(0, 4);
    modelId = typeof body.model === "string" ? body.model : null;
  } catch {
    return new Response(JSON.stringify({ error: "Bad request." }), { status: 400 });
  }
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return new Response(JSON.stringify({ error: "Expected a user message." }), { status: 400 });
  }
  const userText = history[history.length - 1].content;

  // Resolve the model + provider, then require that provider's key.
  const model = getModel(modelId) ?? getModel(DEFAULT_MODEL_ID) ?? getModel("claude-sonnet-5")!;
  const apiKey =
    model.provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const envName = model.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    return new Response(
      JSON.stringify({ error: `${model.label} isn't configured yet (${envName} missing).` }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Meter usage: gate on the org's monthly message quota, then count this turn.
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

  // Resolve (or create) the conversation, then persist the user message.
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
  // Tell the agent its remaining image budget so it can warn before generating
  // (or refuse at zero) — only when image generation is actually available.
  const imageCredits = higgsfieldConfigured()
    ? await aiUsage(admin, orgId).then((u) => ({ remaining: u.image.remaining, limit: u.image.limit }))
    : null;
  const system = systemPrompt({ now: new Date(), timezone, imageCredits });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(sse(obj));
      let assistantText = "";
      let latestProposal: PostProposal | null = null;
      try {
        send({ type: "meta", conversationId: convoId, title, model: model.id });

        const runner = model.provider === "anthropic" ? runAnthropic : runOpenAI;
        const result = await runner({
          apiKey,
          model: model.id,
          system,
          history,
          userText,
          attachments,
          orgId,
          send,
        });
        assistantText = result.assistantText;
        latestProposal = result.latestProposal;

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
