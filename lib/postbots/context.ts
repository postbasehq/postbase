import { createAdminClient } from "@/lib/supabase/admin";
import { botSystemPrompt } from "@/lib/postbots/chat";
import { appName, connectedApps, openAppTools, type AppToolSession } from "@/lib/postbots/apps";
import { botRoutines, type BotRow } from "@/lib/postbots/store";
import type { Routine } from "@/lib/postbots/types";

/**
 * Everything a bot turn needs to know, for a chat turn and a routine run
 * alike: its system prompt (workspace, channels, memory, other bots, its
 * routines) and the workspace's connected apps.
 */
export async function botTurnContext(
  bot: BotRow,
  opts: { timezone: string; userName: string; routine?: Routine },
): Promise<{ system: string; apps: AppToolSession | null }> {
  const admin = createAdminClient();
  // Apps are a bonus: if Composio is down, the bot still works without them.
  const appsReady = connectedApps(bot.org_id)
    // A routine runs with nobody watching, so its session is read-only.
    .then(async (slugs) => ({ slugs, session: await openAppTools(bot.org_id, slugs, opts.routine ? "routine" : "chat") }))
    .catch((e) => {
      console.error("[postbots] apps unavailable", e);
      return { slugs: [] as string[], session: null as AppToolSession | null };
    });
  const [{ data: org }, { data: channels }, { data: memory }, { data: others }, routines, apps] = await Promise.all([
    admin.from("orgs").select("name").eq("id", bot.org_id).maybeSingle(),
    admin.from("channels").select("platform, handle").eq("org_id", bot.org_id),
    admin.from("bot_memory").select("notes").eq("org_id", bot.org_id).maybeSingle(),
    admin.from("bots").select("name, config").eq("org_id", bot.org_id).neq("id", bot.id).limit(10),
    botRoutines(bot.id),
    appsReady,
  ]);
  const system = botSystemPrompt(bot, {
    now: new Date(),
    timezone: opts.timezone,
    userName: opts.userName,
    workspace: { name: org?.name ?? "", channels: channels ?? [] },
    memory: memory?.notes ?? "",
    otherBots: (others ?? []).map((b) => ({ name: b.name as string, job: ((b.config ?? {}) as { job?: string }).job ?? null })),
    apps: apps.session ? apps.slugs.map(appName) : [],
    routines,
    routine: opts.routine,
  });
  return { system, apps: apps.session };
}
