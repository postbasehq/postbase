import { createAdminClient } from "@/lib/supabase/admin";
import { BOT_COLORS, type Bot, type BotCard, type BotColor, type BotMessage } from "@/lib/postbots/types";

/*
 * Server-side reads and writes for Postbots. Writes use the service role (RLS
 * only lets members read), so every caller must have checked the bot belongs
 * to the caller's workspace — loadBot does that by filtering on org_id.
 */

/**
 * The model behind Postbots' chat and sweeps, separate from the /agent model.
 * Haiku by default: the work is short tool calls and sorting search results,
 * and a bot runs on a schedule, so per-call cost matters most.
 */
export const POSTBOTS_MODEL = process.env.POSTBOTS_MODEL || "claude-haiku-4-5";

export type BotRow = {
  id: string;
  org_id: string;
  author_id: string | null;
  kind: string;
  name: string;
  color: string;
  status: string;
  config: Record<string, unknown> | null;
  next_run_at: string | null;
  last_run_at: string | null;
  last_read_at: string;
  updated_at: string;
};

export const BOT_COLUMNS =
  "id, org_id, author_id, kind, name, color, status, config, next_run_at, last_run_at, last_read_at, updated_at";

export function toBot(r: BotRow): Bot {
  return {
    id: r.id,
    name: r.name,
    color: (r.color in BOT_COLORS ? r.color : "blue") as BotColor,
    status: r.status === "active" || r.status === "paused" ? r.status : "setup",
    config: (r.config ?? {}) as Bot["config"],
    nextRunAt: r.next_run_at,
    lastRunAt: r.last_run_at,
    lastReadAt: r.last_read_at,
    updatedAt: r.updated_at,
  };
}

type MessageRow = { id: string; role: string; content: string; cards: unknown; created_at: string };

export function toMessage(r: MessageRow): BotMessage {
  return {
    id: r.id,
    role: r.role === "user" ? "user" : "bot",
    content: r.content,
    cards: Array.isArray(r.cards) ? (r.cards as BotCard[]) : [],
    createdAt: r.created_at,
  };
}

/** The bot, only if it belongs to this workspace. */
export async function loadBot(orgId: string, botId: string): Promise<BotRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(botId)) return null;
  const { data } = await createAdminClient()
    .from("bots")
    .select(BOT_COLUMNS)
    .eq("id", botId)
    .eq("org_id", orgId)
    .maybeSingle();
  return (data as BotRow | null) ?? null;
}

export async function addMessage(
  bot: Pick<BotRow, "id" | "org_id">,
  role: "user" | "bot",
  content: string,
  cards: BotCard[] = [],
): Promise<BotMessage | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("bot_messages")
    .insert({ bot_id: bot.id, org_id: bot.org_id, role, content, cards })
    .select("id, role, content, cards, created_at")
    .single();
  await db.from("bots").update({ updated_at: new Date().toISOString() }).eq("id", bot.id);
  return data ? toMessage(data as MessageRow) : null;
}

/** The latest messages, oldest first. */
export async function recentMessages(botId: string, limit = 60): Promise<BotMessage[]> {
  const { data } = await createAdminClient()
    .from("bot_messages")
    .select("id, role, content, cards, created_at")
    .eq("bot_id", botId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as MessageRow[]).map(toMessage).reverse();
}
