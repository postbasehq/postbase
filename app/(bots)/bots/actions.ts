"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { botsHref } from "@/lib/hosts";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId, getSessionUser } from "@/lib/org";
import { addMessage, loadBot, recentMessages } from "@/lib/postbots/store";
import { BOT_COLORS, type BotConfig, type BotMessage, type DraftCard } from "@/lib/postbots/types";
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
  const colors = Object.keys(BOT_COLORS);
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

/** Save a bot's draft into Postbase: a draft, or scheduled if it has a time. */
export async function saveBotDraft(
  botId: string,
  draft: Pick<DraftCard, "body" | "channelIds" | "scheduledAt">,
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
  return res.ok ? { ok: true, status: res.status } : res;
}
