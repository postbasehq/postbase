import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, sendEmailOnce } from "@/lib/email/send";
import { APP_URL, esc, layout, list, p } from "@/lib/email/templates";
import type { BotRow } from "@/lib/postbots/store";
import { SOURCE_LABEL, type BotCard, type Finding, type Routine } from "@/lib/postbots/types";

/**
 * Email the person who hired the bot when a scheduled sweep finds something,
 * so they hear about it without keeping Postbots open. Best effort, once per
 * sweep (keyed on the bot and the run time).
 */
export async function notifyBotFindings(bot: BotRow, summary: string, findings: Finding[]): Promise<void> {
  if (!emailConfigured() || !bot.author_id || findings.length === 0) return;
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(bot.author_id);
    const to = data.user?.email;
    if (!to) return;
    const shown = findings.slice(0, 5);
    const email = layout({
      subject: `${bot.name}: ${findings.length} new ${findings.length === 1 ? "thing" : "things"} worth a look`,
      preheader: summary,
      heading: `${bot.name} found something`,
      blocks: [
        p(esc(summary), summary),
        list(
          shown.map((f) => ({
            html: `<a href="${esc(f.url)}" style="color:#2b59d9;text-decoration:none;font-weight:600;">${esc(f.title)}</a><br><span style="color:#5f6368;">${esc(SOURCE_LABEL[f.source])} · ${esc(f.why)}</span>`,
            text: `${f.title} (${SOURCE_LABEL[f.source]}) ${f.url} — ${f.why}`,
          })),
        ),
      ],
      cta: { label: `Open ${bot.name}`, url: `${APP_URL}/bots/${bot.id}` },
      footnote: "You're getting this because you set this bot up in Postbots. Ask it to pause in its chat to stop these.",
    });
    await sendEmailOnce(`postbot:${bot.id}:${new Date().toISOString().slice(0, 16)}`, { ...email, to: [to] });
  } catch (e) {
    console.error("[email] postbot findings:", e instanceof Error ? e.message : e);
  }
}

/**
 * Email the bot's owner after a routine runs: what the bot did, and how much
 * is waiting in the team inbox. Best effort, once per run (keyed on the
 * routine and the run time).
 */
export async function notifyRoutineResult(bot: BotRow, routine: Routine, text: string, cards: BotCard[]): Promise<void> {
  if (!emailConfigured() || !bot.author_id || (!text && cards.length === 0)) return;
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(bot.author_id);
    const to = data.user?.email;
    if (!to) return;
    const drafts = cards.filter((c) => c.type === "draft").length;
    const findings = cards.reduce((n, c) => n + (c.type === "findings" ? c.items.length : 0), 0);
    const waiting = [
      drafts ? `${drafts} ${drafts === 1 ? "draft" : "drafts"}` : "",
      findings ? `${findings} ${findings === 1 ? "finding" : "findings"}` : "",
    ].filter(Boolean);
    const summary = text.replace(/[*_`#>]/g, "").trim().slice(0, 600) || `${bot.name} finished: ${routine.instruction}`;
    const email = layout({
      subject: waiting.length ? `${bot.name}: ${waiting.join(" and ")} ready for you` : `${bot.name} did its routine`,
      preheader: summary.slice(0, 140),
      heading: `${bot.name} did its routine`,
      blocks: [p(esc(summary), summary), p(`<span style="color:#5f6368;">${esc(routine.instruction)}</span>`, routine.instruction)],
      cta: waiting.length ? { label: "Open the inbox", url: `${APP_URL}/bots/inbox` } : { label: `Open ${bot.name}`, url: `${APP_URL}/bots/${bot.id}` },
      footnote: "You're getting this because this bot has a routine in Postbots. Ask it to remove the routine in its chat to stop these.",
    });
    await sendEmailOnce(`postbot-routine:${routine.id}:${new Date().toISOString().slice(0, 16)}`, { ...email, to: [to] });
  } catch (e) {
    console.error("[email] postbot routine:", e instanceof Error ? e.message : e);
  }
}
