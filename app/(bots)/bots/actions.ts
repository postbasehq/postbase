"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { botsHref } from "@/lib/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId, getSessionUser } from "@/lib/org";
import { addMessage, loadBot, recentMessages } from "@/lib/postbots/store";
import { NEW_BOT_COLORS, type AppActionCard, type BotCard, type BotConfig, type BotMessage, type DraftCard, type RoutineCard } from "@/lib/postbots/types";
import { resumeAppCall } from "@/lib/postbots/apps";
import { nextRoutineRun } from "@/lib/postbots/schedule";
import { rateLimit } from "@/lib/rate-limit";
import { scheduleProposedPost } from "@/app/(app)/agent/confirm-actions";

/** Bots one workspace can have at once. */
const MAX_BOTS = 10;

/** A bot name as stored: one line, at most 40 characters. */
function cleanName(name: string | undefined): string {
  return String(name ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
}

/**
 * A new bot, from the "To:" picker. With a `name` it keeps that name;
 * without one the chat decides its job and it names itself once it knows.
 * With `greet` it says hello and asks what to focus on; without, the person's
 * own first message (sent by the chat once it opens) starts things off.
 */
export async function createBot(opts: { name?: string; greet?: boolean } = {}): Promise<{ error: string } | { id: string }> {
  const orgId = await getCurrentOrgId();
  const user = await getSessionUser();
  if (!orgId || !user) return { error: "Sign in first." };
  const db = createAdminClient();
  const { count } = await db.from("bots").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if ((count ?? 0) >= MAX_BOTS) return { error: `A workspace can have up to ${MAX_BOTS} bots. Delete one to make another.` };

  const name = cleanName(opts.name);
  const colors = NEW_BOT_COLORS;
  const { data: bot, error } = await db
    .from("bots")
    .insert({
      org_id: orgId,
      author_id: user.id,
      name: name || "New Bot",
      color: colors[(count ?? 0) % colors.length],
      ...(name ? { config: { namedByUser: true } } : {}),
    })
    .select("id, org_id")
    .single();
  if (error || !bot) return { error: "Couldn't make the bot. Try again." };

  if (opts.greet !== false) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const first = String(meta.full_name || meta.name || meta.user_name || "").split(" ")[0];
    await addMessage(
      bot,
      "bot",
      `Hi${first ? ` ${first}` : ""}, I'm ${name ? name : "a new Postbot"}. Tell me what you'd like me to do and I'll set myself up for it. I can keep watch on the web for you, research things, and draft posts for your Postbase channels.`,
      [
        {
          type: "question",
          question: "What would you like me to focus on first?",
          options: ["Listening for mentions", "Finding leads and conversations", "Researching competitors", "Something else"],
          multiSelect: false,
        },
      ],
    );
  }
  revalidatePath("/bots");
  // The caller navigates on the client. A redirect() here reaches it as a thrown
  // error, and Next remounts the whole tree to follow it, which looks like a reload.
  return { id: bot.id };
}

/** Rename a bot. A name they chose sticks: the bot won't rename itself after. */
export async function renameBot(botId: string, name: string): Promise<{ error: string } | { name: string }> {
  const orgId = await getCurrentOrgId();
  const row = orgId ? await loadBot(orgId, botId) : null;
  if (!orgId || !row) return { error: "That bot is gone." };
  const clean = cleanName(name);
  if (!clean) return { error: "A name can't be empty." };
  const config = { ...((row.config ?? {}) as BotConfig), namedByUser: true };
  const { error } = await createAdminClient().from("bots").update({ name: clean, config }).eq("id", botId).eq("org_id", orgId);
  if (error) return { error: "Couldn't rename it. Try again." };
  revalidatePath("/bots");
  return { name: clean };
}

/** Delete a bot with its chat. */
export async function deleteBot(botId: string): Promise<void> {
  const orgId = await getCurrentOrgId();
  if (!orgId || !(await loadBot(orgId, botId))) return;
  await createAdminClient().from("bots").delete().eq("id", botId).eq("org_id", orgId);
  revalidatePath("/bots");
  redirect(botsHref("/bots"));
}

export async function markBotRead(botId: string): Promise<void> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return;
  await createAdminClient()
    .from("bots")
    .update({ last_read_at: new Date().toISOString() })
    .eq("id", botId)
    .eq("org_id", orgId);
}

/** The chat as stored, for refreshing after a sweep posts mid-turn. */
export async function botMessages(botId: string): Promise<BotMessage[]> {
  const orgId = await getCurrentOrgId();
  if (!orgId || !(await loadBot(orgId, botId))) return [];
  return recentMessages(botId);
}

/**
 * Save a bot's draft into Postbase: a draft, or scheduled if it has a time.
 * `from` is the card's place in the chat, so its inbox entry is marked done.
 */
export async function saveBotDraft(
  botId: string,
  draft: Pick<DraftCard, "body" | "channelIds" | "scheduledAt">,
  from?: { messageId: string; cardIndex: number },
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const orgId = await getCurrentOrgId();
  if (!orgId || !(await loadBot(orgId, botId))) return { ok: false, error: "That bot doesn't exist." };
  const res = await scheduleProposedPost({
    body: draft.body,
    thread: [],
    channelIds: draft.channelIds,
    scheduledAt: draft.scheduledAt,
    media: [],
  });
  if (res.ok && from && /^[0-9a-f-]{36}$/i.test(from.messageId)) {
    await createAdminClient()
      .from("bot_inbox")
      .update({ status: "done" })
      .eq("org_id", orgId)
      .eq("message_id", from.messageId)
      .eq("card_index", from.cardIndex);
    revalidatePath("/bots", "layout");
  }
  return res.ok ? { ok: true, status: res.status } : res;
}

/** Clear an inbox item: 'done' when they acted on it, 'dismissed' when they didn't. */
export async function closeInboxItem(id: string, status: "done" | "dismissed"): Promise<void> {
  const orgId = await getCurrentOrgId();
  if (!orgId || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await createAdminClient()
    .from("bot_inbox")
    .update({ status: status === "done" ? "done" : "dismissed" })
    .eq("id", id)
    .eq("org_id", orgId);
  revalidatePath("/bots", "layout");
}

/** Remove one of a bot's routines (the chat header's list). */
export async function deleteRoutine(botId: string, routineId: string): Promise<void> {
  const orgId = await getCurrentOrgId();
  if (!orgId || !(await loadBot(orgId, botId)) || !/^[0-9a-f-]{36}$/i.test(routineId)) return;
  await createAdminClient().from("bot_routines").delete().eq("id", routineId).eq("bot_id", botId);
  revalidatePath("/bots", "layout");
}

/** A card on one of this workspace's bot messages, with what's needed to save it back. */
async function loadCard(botId: string, messageId: string, cardIndex: number) {
  const orgId = await getCurrentOrgId();
  if (!orgId || !(await loadBot(orgId, botId)) || !/^[0-9a-f-]{36}$/i.test(messageId) || !Number.isInteger(cardIndex)) return null;
  const db = createAdminClient();
  const { data } = await db.from("bot_messages").select("cards").eq("id", messageId).eq("bot_id", botId).eq("org_id", orgId).maybeSingle();
  const cards = (Array.isArray(data?.cards) ? data.cards : []) as BotCard[];
  const card = cards[cardIndex];
  if (!card) return null;
  const save = async (next: BotCard) => {
    cards[cardIndex] = next;
    await db.from("bot_messages").update({ cards }).eq("id", messageId).eq("bot_id", botId);
    revalidatePath("/bots", "layout");
  };
  return { orgId, card, save };
}

/** Answer only once per card, even with a double click or two teammates at once (fails closed). */
const claimCard = (messageId: string, cardIndex: number) => rateLimit(`bot-card:${messageId}:${cardIndex}`, 90 * 24 * 3600, 1);

/** Approve or deny an app write a bot asked for. It runs here, on the click, never in the bot's turn. */
export async function answerAppAction(
  botId: string,
  messageId: string,
  cardIndex: number,
  decision: "approve" | "deny",
): Promise<{ ok: true; card: AppActionCard } | { ok: false; error: string }> {
  const found = await loadCard(botId, messageId, cardIndex);
  if (!found || found.card.type !== "app_action") return { ok: false, error: "That request doesn't exist." };
  const card = found.card;
  if (card.status !== "pending" || !(await claimCard(messageId, cardIndex))) return { ok: false, error: "That request was already answered." };
  let next: AppActionCard;
  if (decision === "deny") {
    next = { ...card, status: "denied" };
  } else {
    try {
      const res = await resumeAppCall(card.call);
      next = { ...card, status: res.ok ? "done" : "failed", outcome: res.text.slice(0, 500) };
    } catch (e) {
      next = { ...card, status: "failed", outcome: e instanceof Error ? e.message.slice(0, 300) : "It didn't run." };
    }
  }
  await found.save(next);
  return { ok: true, card: next };
}

/** Turn on, or discard, a routine a bot proposed (saved off until now). */
export async function answerRoutine(
  botId: string,
  messageId: string,
  cardIndex: number,
  decision: "on" | "discard",
): Promise<{ ok: true; card: RoutineCard } | { ok: false; error: string }> {
  const found = await loadCard(botId, messageId, cardIndex);
  if (!found || found.card.type !== "routine") return { ok: false, error: "That routine doesn't exist." };
  const card = found.card;
  if (card.status !== "pending" || !(await claimCard(messageId, cardIndex))) return { ok: false, error: "That routine was already answered." };
  const db = createAdminClient();
  const { data: routine } = await db
    .from("bot_routines")
    .select("id, days, times, timezone")
    .eq("id", card.routineId)
    .eq("bot_id", botId)
    .eq("org_id", found.orgId)
    .maybeSingle();
  if (!routine) {
    await found.save({ ...card, status: "discarded" });
    return { ok: false, error: "That routine was deleted." };
  }
  if (decision === "discard") {
    await db.from("bot_routines").delete().eq("id", routine.id);
  } else {
    const at = nextRoutineRun({ days: routine.days ?? [], times: routine.times ?? [], timezone: routine.timezone }, new Date());
    await db.from("bot_routines").update({ active: true, next_run_at: at }).eq("id", routine.id);
  }
  const next: RoutineCard = { ...card, status: decision === "on" ? "on" : "discarded" };
  await found.save(next);
  return { ok: true, card: next };
}
