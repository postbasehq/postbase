import { createAdminClient } from "@/lib/supabase/admin";
import { reserveAgentMessage } from "@/lib/billing-guard";
import { estimateCostUsd } from "@/lib/agent/models";
import { buildBotHistory, runBotTurn, SEARCH_COST_USD } from "@/lib/postbots/chat";
import { botTurnContext } from "@/lib/postbots/context";
import { nextRoutineRun } from "@/lib/postbots/schedule";
import { addMessage, BOT_COLUMNS, POSTBOTS_MODEL, recentMessages, ROUTINE_COLUMNS, toRoutine, type BotRow } from "@/lib/postbots/store";
import { notifyRoutineResult } from "@/lib/postbots/notify";
import type { Routine } from "@/lib/postbots/types";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Routine runs per workspace per day, below the agent's daily cap, so
 * scheduled jobs can't use up the allowance people need for their own chats.
 */
export const MAX_ROUTINE_RUNS_PER_WORKSPACE_DAY = 30;

/*
 * Routines: a bot's scheduled jobs. Each run is one bot turn with nobody in
 * the chat (the prompt says so), with the same tools, memory and apps as a
 * chat turn. The result posts into the bot's chat, its drafts and findings
 * land in the team inbox (addMessage), and the owner gets an email. Each run
 * counts as one agent message against the plan's backstops, like a chat turn.
 */

export type DueRoutine = Routine & { botId: string; orgId: string };

/** Routines due a run, leased so overlapping cron runs skip them. */
export async function claimDueRoutines(limit: number): Promise<DueRoutine[]> {
  const db = createAdminClient();
  const now = new Date();
  const staleLease = new Date(now.getTime() - 10 * 60_000).toISOString();
  const { data } = await db
    .from("bot_routines")
    .select("id")
    .eq("active", true)
    .lte("next_run_at", now.toISOString())
    .or(`run_lease.is.null,run_lease.lt.${staleLease}`)
    .order("next_run_at", { ascending: true })
    .limit(limit);
  const claimed: DueRoutine[] = [];
  for (const { id } of data ?? []) {
    // Conditional update: only one run wins the lease.
    const { data: row } = await db
      .from("bot_routines")
      .update({ run_lease: now.toISOString() })
      .eq("id", id)
      .or(`run_lease.is.null,run_lease.lt.${staleLease}`)
      .select(`${ROUTINE_COLUMNS}, bot_id, org_id`)
      .maybeSingle();
    if (row) {
      const r = row as Parameters<typeof toRoutine>[0] & { bot_id: string; org_id: string };
      claimed.push({ ...toRoutine(r), botId: r.bot_id, orgId: r.org_id });
    }
  }
  return claimed;
}

export type RoutineOutcome = { ran: boolean; reason?: string };

/** Run one claimed routine, then schedule its next run (also after a skip or a failure). */
export async function runRoutine(routine: DueRoutine): Promise<RoutineOutcome> {
  const db = createAdminClient();
  const finish = (ran: boolean) =>
    db
      .from("bot_routines")
      .update({
        run_lease: null,
        next_run_at: nextRoutineRun(routine, new Date()),
        ...(ran ? { last_run_at: new Date().toISOString() } : {}),
      })
      .eq("id", routine.id);

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await finish(false);
      return { ran: false, reason: "no_key" };
    }
    const { data: botRow } = await db.from("bots").select(BOT_COLUMNS).eq("id", routine.botId).eq("org_id", routine.orgId).maybeSingle();
    const bot = botRow as BotRow | null;
    if (!bot) {
      await finish(false);
      return { ran: false, reason: "no_bot" };
    }

    // A routine acts for whoever set it up: once they've left the workspace, it stops.
    const { data: member } = bot.author_id
      ? await db.from("org_members").select("user_id").eq("org_id", bot.org_id).eq("user_id", bot.author_id).maybeSingle()
      : { data: null };
    if (!member) {
      await db.from("bot_routines").update({ active: false, run_lease: null, next_run_at: null }).eq("id", routine.id);
      return { ran: false, reason: "author_left" };
    }

    if (!(await rateLimit(`routine-runs:${bot.org_id}`, 24 * 3600, MAX_ROUTINE_RUNS_PER_WORKSPACE_DAY))) {
      await finish(false);
      return { ran: false, reason: "routine_cap" };
    }

    // Same backstops as a chat turn (no plan, daily cap, monthly spend).
    const reservation = await reserveAgentMessage(bot.org_id);
    if (!reservation.ok) {
      await finish(false);
      return { ran: false, reason: reservation.reason };
    }

    const userName = await ownerFirstName(bot.author_id);
    const { system, apps } = await botTurnContext(bot, { timezone: routine.timezone, userName, routine });
    const history = buildBotHistory(await recentMessages(bot.id, 30));
    history.push({ role: "user", content: `(Scheduled routine) ${routine.instruction}` });

    const result = await runBotTurn({
      apiKey,
      model: POSTBOTS_MODEL,
      bot,
      system,
      history,
      timezone: routine.timezone,
      send: () => undefined,
      apps,
      routineRun: true,
      persist: async (t, c) => {
        if (t || c.length) await addMessage(bot, "bot", t, c);
      },
    });
    if (result.text || result.cards.length) await addMessage(bot, "bot", result.text, result.cards);
    void db
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

    await finish(true);
    await notifyRoutineResult(bot, routine, result.text, result.cards);
    return { ran: true };
  } catch (e) {
    // Skip this occurrence rather than retry it every 15 minutes.
    await finish(false);
    throw e;
  }
}

async function ownerFirstName(authorId: string | null): Promise<string> {
  if (!authorId) return "";
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(authorId);
    const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    return String(meta.full_name || meta.name || meta.user_name || "").split(" ")[0];
  } catch {
    return "";
  }
}
