import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { reserveAgentMessage } from "@/lib/billing-guard";
import { estimateCostUsd } from "@/lib/agent/models";
import { searchSources, type RawItem } from "@/lib/postbots/sources";
import { nextRunAfter } from "@/lib/postbots/schedule";
import { addMessage, POSTBOTS_MODEL, type BotRow } from "@/lib/postbots/store";
import {
  LISTEN_SOURCES,
  SOURCE_LABEL,
  type Finding,
  type ListenConfig,
  type ListenSource,
} from "@/lib/postbots/types";

/*
 * One Listen sweep: search the sources, drop what the bot has already seen,
 * have Claude sort real mentions from namesakes and noise, and post what's
 * worth your time into the bot's chat. Each sweep that calls the model counts
 * as one agent message against the plan's backstops (daily cap, spend ceiling).
 */

/** How far back the first sweep looks, and the most any sweep looks back. */
const FIRST_LOOKBACK_MS = 7 * 86_400_000;
/** The most new items one sweep sends to the model. */
const MAX_TRIAGE = 40;

export type SweepOutcome =
  | { ok: true; posted: boolean; found: number; summary: string; findings: Finding[]; failed: ListenSource[] }
  | { ok: false; reason: "not_setup" | "limit" | "no_key" | "error"; message: string };

export function listenConfig(raw: Record<string, unknown> | null): ListenConfig | null {
  const c = (raw ?? {}) as Partial<ListenConfig>;
  const keywords = (c.keywords ?? []).map((k) => String(k).trim()).filter(Boolean);
  const sources = (c.sources ?? []).filter((s): s is ListenSource => (LISTEN_SOURCES as readonly string[]).includes(s));
  if (keywords.length === 0 || sources.length === 0) return null;
  return {
    keywords,
    exclude: (c.exclude ?? []).map((k) => String(k).trim()).filter(Boolean),
    sources,
    times: c.times ?? [],
    weekdaysOnly: Boolean(c.weekdaysOnly),
    timezone: c.timezone || "UTC",
    focus: c.focus,
  };
}

/** Drop items that mention an excluded phrase (a namesake product, say). */
export function withoutExcluded(items: RawItem[], exclude: string[]): RawItem[] {
  const terms = exclude.map((e) => e.toLowerCase()).filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((i) => {
    const hay = `${i.title} ${i.text} ${i.author ?? ""}`.toLowerCase();
    return !terms.some((t) => hay.includes(t));
  });
}

const TRIAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "items"],
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "score", "relevant", "kind", "action", "why"],
        properties: {
          index: { type: "integer" },
          score: { type: "integer" },
          relevant: { type: "boolean" },
          kind: { type: "string", enum: ["mention", "conversation", "lead", "news"] },
          action: { type: "string", enum: ["reply", "post", "none"] },
          why: { type: "string" },
        },
      },
    },
  },
} as const;

/** The most findings one sweep shows. */
export const MAX_FINDINGS = 5;
/** Lowest score (1-5) that gets shown. */
const MIN_SCORE = 4;

/** The model's verdicts → what the user sees: 4s and 5s, best first, capped. */
export function pickFindings(t: Triage, items: RawItem[]): Finding[] {
  return t.items
    .filter((v) => v.score >= MIN_SCORE && items[v.index])
    .sort((a, b) => b.score - a.score)
    .filter((v, i, all) => all.findIndex((w) => w.index === v.index) === i)
    .slice(0, MAX_FINDINGS)
    .map((v) => {
      const it = items[v.index];
      return {
        source: it.source,
        url: it.url,
        title: it.title,
        author: it.author,
        why: v.why,
        kind: v.kind,
        action: v.action,
        publishedAt: it.publishedAt,
      };
    });
}

export type Triage = {
  summary: string;
  items: { index: number; score: number; relevant: boolean; kind: Finding["kind"]; action: Finding["action"]; why: string }[];
};

function triagePrompt(config: ListenConfig, items: RawItem[], first: boolean): string {
  const list = items
    .map((it, i) =>
      [
        `[${i}] ${SOURCE_LABEL[it.source]} · ${it.author ?? "unknown"} · ${it.publishedAt?.slice(0, 10) ?? "undated"}`,
        `Title: ${it.title}`,
        it.text ? `Text: ${it.text}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
  return `You are a Listen Postbot. You watch the web for a busy founder or creator and interrupt them only when something deserves their time. Every item you pass on costs them attention, so be selective: most search results are noise, and an empty result is a good result.

They asked you to listen for: ${config.keywords.join(", ")}
${config.exclude.length ? `These are NOT them (namesakes or unrelated things with a similar name): ${config.exclude.join(", ")}\n` : ""}${config.focus ? `What they care about: ${config.focus}\n` : ""}
Below are ${items.length} new search results. Score each one from 1 to 5 by asking: would they thank you for showing them this?
- 5: someone talks about them or their product directly, or asks for exactly what they offer (a lead).
- 4: a live conversation squarely in their focus where a reply from them would be welcome and useful, or news that changes something for them.
- 3: on topic but generic: release notes, tutorials, courses, opinion pieces, people casually using the thing.
- 2: only loosely related, or about the keyword rather than about what they care about.
- 1: a namesake, an unrelated use of the word, spam, or self-promotion by someone else.
${config.focus ? "Their focus is a hard filter: an item that only mentions a keyword in passing, without touching their focus, scores 3 or lower unless it's a direct mention of them.\n" : ""}Only scores of 4 and 5 are shown to them. Expect most items to score 1-3; it's normal for none to reach 4.

For each item give:
- score: 1-5 as above.
- relevant: true only when score is 4 or 5.
- kind: "mention" (talks about them directly), "conversation" (a thread they could usefully join), "lead" (someone asking for what they offer), or "news".
- action: "reply" if a reply from them would help (score 4-5 conversations, mentions, leads), "post" if it's worth a post of their own, otherwise "none".
- why: one plain sentence on why it matters to them specifically, e.g. what they could say or gain. Not a summary of the item.

Then write "summary", about only the items scoring 4-5: ${first ? "2-3 sentences on this first sweep: what's worth their attention (or that nothing was, and what the results were mostly about), plus anything notable such as a namesake to filter out." : "1-2 sentences on what's new and the one thing most worth doing. If nothing scored 4-5, say so in one sentence."} Plain, friendly, no hype, no emoji, no markdown headings. Don't list the items; they appear as cards.

Results:

${list}`;
}

async function triage(
  apiKey: string,
  config: ListenConfig,
  items: RawItem[],
  first: boolean,
): Promise<{ triage: Triage; usage: Anthropic.Usage }> {
  const anthropic = new Anthropic({ apiKey });
  const res = await anthropic.messages.create({
    model: POSTBOTS_MODEL,
    max_tokens: 8000,
    output_config: { format: { type: "json_schema", schema: TRIAGE_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: "user", content: triagePrompt(config, items, first) }],
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined to sort these results.");
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return { triage: JSON.parse(text) as Triage, usage: res.usage };
}

/**
 * Sweep one bot now. `first` looks back a week and always reports back, even
 * when nothing turned up; scheduled sweeps only post when there's news.
 */
export async function runSweep(bot: BotRow, opts: { first?: boolean } = {}): Promise<SweepOutcome> {
  const db = createAdminClient();
  const config = listenConfig(bot.config);
  if (!config) return { ok: false, reason: "not_setup", message: "Set up what to listen for and where first." };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, reason: "no_key", message: "Postbots aren't switched on yet (ANTHROPIC_API_KEY missing)." };

  const now = new Date();
  const first = opts.first ?? !bot.last_run_at;
  const lastRun = bot.last_run_at ? new Date(bot.last_run_at).getTime() : 0;
  const since = new Date(Math.max(now.getTime() - FIRST_LOOKBACK_MS, first ? 0 : lastRun - 3_600_000));

  const finish = async () => {
    await db
      .from("bots")
      .update({ last_run_at: now.toISOString(), next_run_at: bot.status === "active" ? nextRunAfter(config, now) : null, run_lease: null })
      .eq("id", bot.id);
  };

  const { items: found, failed } = await searchSources(config.sources, config.keywords, since);

  // Only what this bot hasn't reported before.
  const ids = found.map((i) => i.externalId);
  const { data: seenRows } = ids.length
    ? await db.from("bot_seen_items").select("source, external_id").eq("bot_id", bot.id).in("external_id", ids)
    : { data: [] as { source: string; external_id: string }[] };
  const seen = new Set((seenRows ?? []).map((r) => `${r.source}:${r.external_id}`));
  const fresh = withoutExcluded(
    found.filter((i) => !seen.has(`${i.source}:${i.externalId}`)),
    config.exclude,
  )
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, MAX_TRIAGE);

  const failedNote = failed.length
    ? ` I couldn't reach ${failed.map((s) => SOURCE_LABEL[s]).join(" or ")} this time, so I'll try again next check.`
    : "";

  if (fresh.length === 0) {
    await finish();
    const summary = `Nothing new turned up for ${config.keywords.join(", ")} in the last ${first ? "week" : "few hours"}.${failedNote}`;
    if (first) await addMessage(bot, "bot", `${summary} I'll keep checking and message you here when something does.`);
    return { ok: true, posted: first, found: 0, summary, findings: [], failed };
  }

  const reservation = await reserveAgentMessage(bot.org_id);
  if (!reservation.ok) {
    await finish();
    const message =
      reservation.reason === "no_plan"
        ? "This workspace needs an active Postbase plan for me to keep listening."
        : "This workspace has reached its AI allowance for now, so I skipped this check.";
    return { ok: false, reason: "limit", message };
  }

  let result: Triage;
  try {
    const { triage: t, usage } = await triage(apiKey, config, fresh, first);
    result = t;
    void db
      .from("agent_messages")
      .update({
        model: POSTBOTS_MODEL,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cost_usd: estimateCostUsd(POSTBOTS_MODEL, {
          input: usage.input_tokens,
          output: usage.output_tokens,
          cacheRead: usage.cache_read_input_tokens ?? 0,
          cacheWrite: usage.cache_creation_input_tokens ?? 0,
        }),
      })
      .eq("id", reservation.id)
      .then(() => undefined, () => undefined);
  } catch (e) {
    await db.from("bots").update({ run_lease: null }).eq("id", bot.id);
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "The sweep failed." };
  }

  // Everything sent to the model counts as seen, relevant or not.
  await db.from("bot_seen_items").upsert(
    fresh.map((i) => ({ bot_id: bot.id, source: i.source, external_id: i.externalId })),
    { onConflict: "bot_id,source,external_id", ignoreDuplicates: true },
  );

  const findings = pickFindings(result, fresh);

  await finish();
  const summary = `${result.summary.trim()}${failedNote}`;
  const posted = first || findings.length > 0;
  if (posted) await addMessage(bot, "bot", summary, findings.length ? [{ type: "findings", items: findings }] : []);
  return { ok: true, posted, found: findings.length, summary, findings, failed };
}

/** Bots due a scheduled sweep, leased so overlapping cron runs skip them. */
export async function claimDueBots(limit: number): Promise<BotRow[]> {
  const db = createAdminClient();
  const now = new Date();
  const staleLease = new Date(now.getTime() - 10 * 60_000).toISOString();
  const { data } = await db
    .from("bots")
    .select("id")
    .eq("status", "active")
    .lte("next_run_at", now.toISOString())
    .or(`run_lease.is.null,run_lease.lt.${staleLease}`)
    .order("next_run_at", { ascending: true })
    .limit(limit);
  const claimed: BotRow[] = [];
  for (const { id } of data ?? []) {
    // Conditional update: only one run wins the lease.
    const { data: row } = await db
      .from("bots")
      .update({ run_lease: now.toISOString() })
      .eq("id", id)
      .or(`run_lease.is.null,run_lease.lt.${staleLease}`)
      .select("id, org_id, author_id, kind, name, color, status, config, next_run_at, last_run_at, last_read_at, updated_at")
      .maybeSingle();
    if (row) claimed.push(row as BotRow);
  }
  return claimed;
}
