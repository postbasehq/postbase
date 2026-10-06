import { cookies } from "next/headers";
import { getCurrentOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingGroup, reserveAgentMessage, aiUsage, NO_PLAN_MESSAGE, PAST_DUE_NOTE } from "@/lib/billing-guard";
import { AGENT_DAILY_CAP } from "@/lib/plans";
import { higgsfieldConfigured } from "@/lib/higgsfield";
import { systemPrompt } from "@/lib/agent/config";
import { getModel, DEFAULT_MODEL_ID, estimateCostUsd } from "@/lib/agent/models";
import { runAnthropic } from "@/lib/agent/run-anthropic";
import { runOpenAI } from "@/lib/agent/run-openai";
import { buildHistory, HISTORY_TURNS, type StoredMessage } from "@/lib/agent/history";
import type { PostProposal } from "@/lib/agent/tools";

export const runtime = "nodejs";
// Image generation can sit in Higgsfield's queue for a while before running, so
// give the function real headroom — the image poller waits up to ~110s.
export const maxDuration = 120;

type ClientMessage = { role: "user" | "assistant"; content: string };

// Bounds on what one message can send the model, so its cost stays at a few
// cents however it's called (history bounds live in lib/agent/history.ts).
const MAX_USER_CHARS = 4000;
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
    // Only the new message is taken from the browser; the history is loaded below.
    const last = (body.messages ?? []).at(-1);
    history = last && last.role === "user" && typeof last.content === "string" ? [{ role: "user", content: last.content }] : [];
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
  if (userText.length > MAX_USER_CHARS) {
    return new Response(
      JSON.stringify({ error: `That message is too long. Keep it under ${MAX_USER_CHARS.toLocaleString("en-US")} characters.` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

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

  // Unlimited under fair use, with two per-plan backstops (lib/plans.ts). Count this turn.
  const admin = createAdminClient();
  // Atomic check-and-count (reserve_agent_message), so parallel requests can't
  // slip past the daily cap or the monthly spend ceiling.
  const reservation = await reserveAgentMessage(orgId);
  const limit = reservation.ok ? null : reservation.reason;
  if (limit === "error") {
    return new Response(JSON.stringify({ error: "Couldn't check your agent allowance. Try again in a moment." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (limit === "no_plan") {
    return new Response(JSON.stringify({ error: NO_PLAN_MESSAGE }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (limit) {
    const group = await billingGroup(orgId);
    if (limit === "budget") console.error(`[agent] monthly spend ceiling reached for plan ${group.rootId} (${group.plan})`);
    const viaMcp = " To keep going now, connect Postbase to Claude or ChatGPT through MCP (Developers page) and work from your own assistant.";
    return new Response(
      JSON.stringify({
        error:
          limit === "daily"
            ? group.pastDue
              ? `${PAST_DUE_NOTE} Until then, the AI agent is limited to ${AGENT_DAILY_CAP[group.usagePlan]} messages a day.${viaMcp}`
              : group.trialing
              ? `You've reached today's AI agent limit for your free trial (${AGENT_DAILY_CAP[group.usagePlan]} messages). It resets at midnight UTC, or start your plan early on the Billing page for its full limit.${viaMcp}`
              : `You've reached today's AI agent limit for your plan (${AGENT_DAILY_CAP[group.usagePlan]} messages). It resets at midnight UTC.${viaMcp}`
            : group.pastDue
              ? `${PAST_DUE_NOTE} Until then, the AI agent's monthly limit is lower.${viaMcp}`
              : `Your plan has reached this month's fair-use limit for the AI agent. It resets on the 1st. If you need more, email team@postbase.so.${viaMcp}`,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }
  const usageRowId = reservation.ok ? reservation.id : null;

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
    // Earlier turns from the database (before this message is stored), then this one.
    const { data: stored } = await admin
      .from("agent_chat_messages")
      .select("role, content, images")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_TURNS);
    history = [...buildHistory((stored ?? []) as StoredMessage[]), { role: "user", content: userText }];
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
    ? await aiUsage(admin, orgId).then((u) => ({ remaining: u.image.remaining, limit: u.image.limit, trialing: u.trialing }))
    : null;
  const system = systemPrompt({ now: new Date(), timezone, imageCredits });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(sse(obj));
      let assistantText = "";
      let latestProposal: PostProposal | null = null;
      const images: string[] = [];
      // Note images generated this turn so later turns can attach them.
      const forward = (obj: unknown) => {
        const o = obj as { type?: string; url?: unknown };
        if (o?.type === "image" && typeof o.url === "string") images.push(o.url);
        send(obj);
      };
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
          send: forward,
        });
        assistantText = result.assistantText;
        latestProposal = result.latestProposal;
        // Log tokens + estimated cost on this message's usage row (best effort).
        if (usageRowId) {
          const u = result.usage;
          void admin
            .from("agent_messages")
            .update({
              model: model.id,
              input_tokens: u.input,
              output_tokens: u.output,
              cache_read_tokens: u.cacheRead,
              cache_write_tokens: u.cacheWrite,
              cost_usd: estimateCostUsd(model.id, u),
            })
            .eq("id", usageRowId)
            .then(() => undefined, () => undefined);
        }

        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "The agent hit an error." });
      } finally {
        // Persist the assistant turn (best effort) and bump the conversation.
        if (convoId && (assistantText.trim() || latestProposal || images.length)) {
          try {
            await admin.from("agent_chat_messages").insert({
              conversation_id: convoId,
              org_id: orgId,
              role: "assistant",
              content: assistantText,
              proposal: latestProposal,
              images: images.length ? images : null,
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
