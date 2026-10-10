import { cookies } from "next/headers";
import { getCurrentOrgId, getSessionUser } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { reserveAgentMessage, NO_PLAN_MESSAGE } from "@/lib/billing-guard";
import { estimateCostUsd } from "@/lib/agent/models";
import { addMessage, loadBot, POSTBOTS_MODEL, recentMessages } from "@/lib/postbots/store";
import { botSystemPrompt, buildBotHistory, runBotTurn, SEARCH_COST_USD } from "@/lib/postbots/chat";
import { validTimeZone } from "@/lib/postbots/schedule";
import type { BotCard } from "@/lib/postbots/types";

export const runtime = "nodejs";
// A turn can include a sweep or a few web searches.
export const maxDuration = 120;

const MAX_USER_CHARS = 4000;
const enc = new TextEncoder();
const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export async function POST(req: Request, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const orgId = await getCurrentOrgId();
  if (!orgId) return json({ error: "No workspace found." }, 401);
  const bot = await loadBot(orgId, botId);
  if (!bot) return json({ error: "That bot doesn't exist." }, 404);

  let text = "";
  try {
    const body = (await req.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  if (!text) return json({ error: "Say something first." }, 400);
  if (text.length > MAX_USER_CHARS) return json({ error: `Keep it under ${MAX_USER_CHARS.toLocaleString("en-GB")} characters.` }, 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "Postbots aren't switched on yet (ANTHROPIC_API_KEY missing)." }, 503);

  // Each turn counts as one agent message against the plan's backstops.
  const reservation = await reserveAgentMessage(orgId);
  if (!reservation.ok) {
    const message =
      reservation.reason === "no_plan"
        ? NO_PLAN_MESSAGE
        : reservation.reason === "daily"
          ? "You've reached today's AI limit. It resets at midnight UTC."
          : reservation.reason === "budget"
            ? "This workspace has used this month's AI allowance."
            : "Couldn't check your AI allowance. Try again in a moment.";
    return json({ error: message }, reservation.reason === "error" ? 503 : reservation.reason === "no_plan" ? 402 : 429);
  }

  const history = buildBotHistory([...(await recentMessages(bot.id, 30))]);
  await addMessage(bot, "user", text);
  history.push({ role: "user", content: text });

  const user = await getSessionUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const userName = String(meta.full_name || meta.name || meta.user_name || "").split(" ")[0];
  const tzCookie = (await cookies()).get("pb_tz")?.value;
  const timezone = validTimeZone(tzCookie ? decodeURIComponent(tzCookie) : null) ?? "UTC";
  const admin = createAdminClient();
  const [{ data: org }, { data: channels }, { data: memory }, { data: others }] = await Promise.all([
    admin.from("orgs").select("name").eq("id", orgId).maybeSingle(),
    admin.from("channels").select("platform, handle").eq("org_id", orgId),
    admin.from("bot_memory").select("notes").eq("org_id", orgId).maybeSingle(),
    admin.from("bots").select("name, config").eq("org_id", orgId).neq("id", bot.id).limit(10),
  ]);
  const system = botSystemPrompt(bot, {
    now: new Date(),
    timezone,
    userName,
    workspace: { name: org?.name ?? "", channels: channels ?? [] },
    memory: memory?.notes ?? "",
    otherBots: (others ?? []).map((b) => ({ name: b.name as string, job: ((b.config ?? {}) as { job?: string }).job ?? null })),
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(sse(obj));
      let replyText = "";
      let replyCards: BotCard[] = [];
      try {
        const result = await runBotTurn({
          apiKey,
          model: POSTBOTS_MODEL,
          bot,
          system,
          history,
          timezone,
          send,
          persist: async (t, c) => {
            if (t || c.length) await addMessage(bot, "bot", t, c);
          },
        });
        replyText = result.text;
        replyCards = result.cards;
        void admin
          .from("agent_messages")
          .update({
            model: POSTBOTS_MODEL,
            input_tokens: result.usage.input,
            output_tokens: result.usage.output,
            cache_read_tokens: result.usage.cacheRead,
            cache_write_tokens: result.usage.cacheWrite,
            cost_usd: (estimateCostUsd(POSTBOTS_MODEL, result.usage) ?? 0) + result.usage.searches * SEARCH_COST_USD,
          })
          .eq("id", reservation.id)
          .then(() => undefined, () => undefined);
        send({ type: "done", bot: { name: bot.name, status: bot.status } });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "The bot hit an error." });
      } finally {
        if (replyText || replyCards.length) {
          try {
            await addMessage(bot, "bot", replyText, replyCards);
          } catch {
            // The reply already streamed.
          }
        }
        // Reading the chat counts as reading what the bot said.
        await admin.from("bots").update({ last_read_at: new Date().toISOString() }).eq("id", bot.id);
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
