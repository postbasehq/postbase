import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { listChannels, listPosts } from "@/lib/api-core";
import { cleanTimes, nextRunAfter, validTimeZone } from "@/lib/postbots/schedule";
import { runSweep, listenConfig } from "@/lib/postbots/sweep";
import type { BotRow } from "@/lib/postbots/store";
import { formatInTz } from "@/lib/tz-core";
import {
  LISTEN_SOURCES,
  SOURCE_LABEL,
  type BotCard,
  type BotConfig,
  type BotMessage,
  type ListenConfig,
  type ListenSource,
} from "@/lib/postbots/types";

/*
 * A Postbot's side of the chat. A bot starts blank: the user describes a job
 * in conversation, and the bot names itself and sets up whichever of its
 * skills the job needs. The skills are the tools below; anything they can't
 * do, the bot says so plainly instead of pretending.
 *
 *   Listen    scheduled sweeps of Reddit, Hacker News, Bluesky and Google News
 *   Research  web search, on request, in the chat
 *   Postbase  read channels and posts; draft posts the user saves or schedules
 *
 * The bot never posts anywhere: drafts come back as cards for the human.
 */

export const MAX_TOOL_ROUNDS = 8;
const MAX_OUTPUT_TOKENS = 4000;
/** Web searches per turn, so a research turn costs cents. */
const MAX_SEARCHES = 4;
/** Anthropic's web search price, per search. */
export const SEARCH_COST_USD = 0.01;

export type SendFn = (obj: unknown) => void;

const sourceList = LISTEN_SOURCES.map((s) => `"${s}" (${SOURCE_LABEL[s]})`).join(", ");

function describeSetup(bot: BotRow): string {
  const c = (bot.config ?? {}) as BotConfig;
  const parts = [
    `Name: ${bot.name}${bot.name === "New Bot" ? " (not named yet)" : ""}.`,
    `Job: ${c.job || "not agreed yet"}.`,
  ];
  if (c.keywords?.length) {
    const tz = c.timezone || "UTC";
    parts.push(
      `Listening (${bot.status === "paused" ? "paused" : bot.status === "active" ? "running" : "saved"}): for ${c.keywords.join(", ")}` +
        `${c.exclude?.length ? `, excluding ${c.exclude.join(", ")}` : ""}` +
        ` on ${(c.sources ?? []).map((s) => SOURCE_LABEL[s as ListenSource] ?? s).join(", ")}` +
        ` at ${(c.times ?? []).join(", ")} ${c.weekdaysOnly ? "on weekdays" : "daily"} (${tz}).` +
        `${c.focus ? ` Focus: ${c.focus}.` : ""}` +
        `${bot.next_run_at ? ` Next check ${formatInTz(bot.next_run_at, tz, { weekday: "short", hour: "2-digit", minute: "2-digit" })}.` : ""}`,
    );
  } else {
    parts.push("Listening: not set up.");
  }
  return parts.join(" ");
}

export type BotContext = {
  now: Date;
  timezone: string;
  userName: string;
  /** Their workspace name and connected accounts, so the bot knows who it works for. */
  workspace?: { name: string; channels: { platform: string; handle: string | null }[] };
  /** What the bots have learned about them (shared by every bot in the workspace). */
  memory?: string;
  /** The workspace's other bots and their jobs. */
  otherBots?: { name: string; job: string | null }[];
};

/** The most the shared memory holds, so it stays a short brief. */
export const MAX_MEMORY_CHARS = 1500;

function describeWorkspace(w: BotContext["workspace"]): string {
  if (!w) return "unknown";
  const accounts = w.channels.map((c) => `${c.platform}${c.handle ? ` @${c.handle.replace(/^@/, "")}` : ""}`).join(", ");
  return `"${w.name}"${accounts ? `; connected accounts: ${accounts}` : "; no accounts connected yet"}. They use Postbase to schedule posts, so they're building an audience for themselves or their business.`;
}

export function botSystemPrompt(bot: BotRow, ctx: BotContext): string {
  return `You are a Postbot, a bot in Postbots, part of Postbase (a social media scheduler for founders and creators). ${ctx.userName || "The user"} makes bots by chatting: each bot starts blank, and the conversation decides its job. You talk like a capable, friendly colleague: short messages, plain words, no hype, no emoji, no markdown headings.

## Your skills
These are everything you can do. Use them in whatever combination the job needs.
1. Listen: watch the web on a schedule and message the user when something new and worth their time turns up. Sources: ${sourceList}. Set it up with save_listen_setup; check right away with run_sweep; pause or resume with set_status.
2. Research: search the web right now with web_search, then give a short, sourced answer (competitors, what people say about a topic, where a conversation is happening). Research runs only when asked in chat; there's no scheduled research, so for ongoing tracking use Listen.
3. Postbase: see their connected channels (list_channels) and their scheduled posts and drafts (list_posts); draft a post with draft_post for them to save or schedule.

## What you can't do
Say so in one or two plain sentences, then offer the closest thing you can do. Don't attempt it or pretend.
- You can't read or search X, LinkedIn, Instagram, Facebook, TikTok or YouTube directly: their search is paid or closed, and you never sign in as the user. For "track competitors on X", explain this and offer to research them on the open web and listen for them on Reddit, Hacker News, Bluesky and the news, where the same conversations often happen in public.
- You can't send DMs, reply, like, follow or post anything yourself. You draft; the user posts.
- You can't log into accounts, see their analytics outside Postbase, or work with files.
- Anything unrelated to growing their audience or business on social media (writing code, homework, general trivia): say it's outside what Postbots does.

## How to work
- Bias to action. As soon as you know enough to make a useful start, start: search, set up listening, draft. Don't ask "sound good?" or for permission to do what they just asked. Ask only when the answer changes what you'd do, and use what you know about them (below) instead of asking.
- Never ask for something you can look up. Who their competitors are, what a product does, where people discuss a topic: search for it with web_search, then tell them what you found and let them correct you.
- When something they asked for is out of reach (e.g. X), say so in one sentence and go straight on to the closest thing you can do, in the same reply.
- When the job is clear, call set_identity once: a short name ending in "Bot" (two or three words, e.g. "Opportunities Bot", "Mentions Bot") and the job in one line. Rename only if the job changes a lot or they ask.
- Agree what's needed one question at a time. Use ask_user only to offer a choice between real answers (2-5 options, under 6 words each, e.g. sources, how often); never options about the conversation itself. For open questions (what are you building?), just ask in plain text. End a message with at most one question, either in text or as a card, never both. After ask_user, stop and wait.
- For listening: you need what to look for (names, websites, competitors, topics), which sources, and how often. Turn "every few hours on weekdays" etc. into concrete times, avoiding the top of the hour (e.g. 09:05, 12:35). Add likely namesakes to "exclude". Then save_listen_setup, say what you'll do and when in one or two sentences, and run_sweep for a first look. Its findings appear as cards; don't list them again.
- For research: search, then answer briefly with the few things that matter and where they came from. Offer one useful next step (listen for it, draft a post).
- For drafts: call list_channels first for real channel ids; never invent one. Never claim anything is posted or scheduled; the user does that from the card.
- When they tell you something lasting about themselves (their product or company and its website, who their customers are, their competitors, their voice), call remember with the full updated note, so every bot knows it. Keep it a short factual brief; don't store anything sensitive.
- Never make up results, mentions, numbers or links. Only report what your tools returned.

## Context
- This bot: ${describeSetup(bot)}
- Who you work for: ${ctx.userName || "the user"}, workspace ${describeWorkspace(ctx.workspace)}
- What you know about them (shared by all their bots): ${ctx.memory?.trim() || "nothing yet. Early on, ask what they're building or who they are (one question), then remember it."}
- Their other bots: ${ctx.otherBots?.length ? ctx.otherBots.map((b) => `${b.name}${b.job ? ` (${b.job})` : ""}`).join("; ") : "none"}
- Current time: ${ctx.now.toISOString()} (${ctx.now.toLocaleString("en-GB", { timeZone: ctx.timezone })})
- User's timezone: ${ctx.timezone}`;
}

const CUSTOM_TOOLS: Anthropic.Tool[] = [
  {
    name: "ask_user",
    description: "Ask the user one question with tap-to-answer options. They can also type their own answer. End your turn after calling this.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["question", "options"],
      properties: {
        question: { type: "string", description: "The question, short." },
        options: { type: "array", items: { type: "string" }, description: "2-5 short options." },
        multi_select: { type: "boolean", description: "True if they can pick more than one." },
      },
    },
  },
  {
    name: "set_identity",
    description: "Name yourself and record your job, once the user has said what they want you to do.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["name", "job"],
      properties: {
        name: { type: "string", description: "Two or three words ending in \"Bot\", e.g. \"Opportunities Bot\"." },
        job: { type: "string", description: "Your job in one line." },
      },
    },
  },
  {
    name: "remember",
    description: "Save what you know about the user and their business, shared with all their bots. Pass the complete note (it replaces the old one); a short factual brief.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["notes"],
      properties: { notes: { type: "string", description: "E.g. \"Runs Postbase (postbase.so), an open-source social media scheduler with an MCP server. Competitors: Buffer, Hootsuite, Postiz, Typefully.\"" } },
    },
  },
  {
    name: "save_listen_setup",
    description: "Save (or replace) what you listen for, where, and when, and start the schedule. Pass the complete setup.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["keywords", "sources", "times"],
      properties: {
        keywords: { type: "array", items: { type: "string" }, description: "Names and phrases to search for, e.g. [\"Postbase\", \"postbase.so\"]." },
        exclude: { type: "array", items: { type: "string" }, description: "Phrases that mark a result as someone else's (namesakes)." },
        sources: { type: "array", items: { type: "string", enum: [...LISTEN_SOURCES] } },
        times: { type: "array", items: { type: "string" }, description: "Local check times as HH:MM, at most 6." },
        weekdays_only: { type: "boolean" },
        timezone: { type: "string", description: "IANA timezone; defaults to the user's." },
        focus: { type: "string", description: "One line on what matters most (e.g. leads, competitor launches, questions to answer). Used to filter results." },
      },
    },
  },
  {
    name: "set_status",
    description: "Pause or resume your scheduled listening.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["status"],
      properties: { status: { type: "string", enum: ["active", "paused"] } },
    },
  },
  {
    name: "run_sweep",
    description: "Check your listening sources now for anything new. Its summary and findings are shown to the user as their own message.",
    input_schema: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "list_channels",
    description: "List the user's connected Postbase channels (id, platform, handle). Call before draft_post.",
    input_schema: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "list_posts",
    description: "List the user's Postbase posts, optionally filtered by status ('scheduled', 'draft', 'published').",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: { status: { type: "string" } },
    },
  },
  {
    name: "draft_post",
    description: "Show the user a post draft they can save to Postbase or schedule. Does not post anything.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["body", "channel_ids"],
      properties: {
        body: { type: "string" },
        channel_ids: { type: "array", items: { type: "string" } },
        scheduled_at: { type: "string", description: "ISO 8601 time, only if the user asked for one." },
      },
    },
  },
];

export const BOT_TOOLS: Anthropic.ToolUnion[] = [
  ...CUSTOM_TOOLS,
  { type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES },
];

type ToolOutcome = { forModel: string; card?: BotCard; stop?: boolean };

const strings = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, max);

const nextLabel = (iso: string | null, tz: string) =>
  iso ? formatInTz(iso, tz, { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "none";

async function runTool(
  bot: BotRow,
  name: string,
  input: Record<string, unknown>,
  ctx: { timezone: string },
): Promise<ToolOutcome> {
  const db = createAdminClient();
  const config = (bot.config ?? {}) as BotConfig;
  switch (name) {
    case "ask_user": {
      const options = strings(input.options, 5).map((o) => o.slice(0, 60));
      const question = String(input.question ?? "").trim().slice(0, 200);
      if (!question || options.length < 2) return { forModel: "A question needs a question and 2-5 options." };
      return {
        forModel: "Shown. Wait for their answer.",
        card: { type: "question", question, options, multiSelect: Boolean(input.multi_select) },
        stop: true,
      };
    }
    case "set_identity": {
      const newName = String(input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      const job = String(input.job ?? "").trim().slice(0, 200);
      if (!newName) return { forModel: "A name can't be empty." };
      const next: BotConfig = { ...config, job: job || config.job };
      await db.from("bots").update({ name: newName, config: next }).eq("id", bot.id);
      bot.name = newName;
      bot.config = next;
      return { forModel: `You're now "${newName}". Job saved.` };
    }
    case "remember": {
      const notes = String(input.notes ?? "").trim().slice(0, MAX_MEMORY_CHARS);
      if (!notes) return { forModel: "Nothing to remember." };
      await db.from("bot_memory").upsert({ org_id: bot.org_id, notes, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
      return { forModel: "Remembered. All their bots know this now." };
    }
    case "save_listen_setup": {
      const sources = strings(input.sources, 4).filter((s): s is ListenSource => (LISTEN_SOURCES as readonly string[]).includes(s));
      const listen: ListenConfig = {
        keywords: strings(input.keywords, 8).map((k) => k.slice(0, 60)),
        exclude: strings(input.exclude, 10).map((k) => k.slice(0, 60)),
        sources,
        times: cleanTimes(input.times),
        weekdaysOnly: Boolean(input.weekdays_only),
        timezone: validTimeZone(input.timezone) ?? ctx.timezone,
        focus: typeof input.focus === "string" ? input.focus.slice(0, 200) : undefined,
      };
      if (listen.keywords.length === 0) return { forModel: "Not saved: add at least one keyword." };
      if (listen.sources.length === 0) return { forModel: `Not saved: pick at least one source from ${LISTEN_SOURCES.join(", ")}.` };
      if (listen.times.length === 0) return { forModel: "Not saved: give at least one check time as HH:MM." };
      const next: BotConfig = { ...listen, job: config.job };
      const status = bot.status === "paused" ? "paused" : "active";
      const at = status === "active" ? nextRunAfter(listen, new Date()) : null;
      await db.from("bots").update({ config: next, status, next_run_at: at, updated_at: new Date().toISOString() }).eq("id", bot.id);
      bot.config = next;
      bot.status = status;
      bot.next_run_at = at;
      return {
        forModel: `Saved. Checks at ${listen.times.join(", ")} ${listen.weekdaysOnly ? "on weekdays" : "daily"} (${listen.timezone}). Next check: ${nextLabel(at, listen.timezone)}.${status === "paused" ? " Listening is paused; resume with set_status." : ""}`,
      };
    }
    case "set_status": {
      const status = input.status === "paused" ? "paused" : "active";
      const listen = listenConfig(bot.config);
      if (!listen) return { forModel: "There's no listening set up to pause or resume." };
      const at = status === "active" ? nextRunAfter(listen, new Date()) : null;
      await db.from("bots").update({ status, next_run_at: at }).eq("id", bot.id);
      bot.status = status;
      bot.next_run_at = at;
      return { forModel: status === "paused" ? "Paused. No scheduled checks until resumed." : `Resumed. Next check ${nextLabel(at, listen.timezone)}.` };
    }
    case "run_sweep": {
      const out = await runSweep(bot);
      if (!out.ok) return { forModel: out.message };
      const lines = out.findings.map((f, i) => `${i + 1}. [${f.kind}, suggest ${f.action}] ${f.title} (${SOURCE_LABEL[f.source]}) ${f.url} — ${f.why}`);
      return {
        forModel: `Sweep done. ${out.found} item(s) worth showing.${out.posted ? ` Already posted to the user as its own message: "${out.summary}"` : ""}${lines.length ? `\n${lines.join("\n")}` : ""}\nDon't repeat the summary or list the items; add at most one short line (e.g. offer to draft a reply).`,
      };
    }
    case "list_channels": {
      const channels = await listChannels(bot.org_id);
      if (channels.length === 0) return { forModel: "No channels connected in Postbase. They can connect one under Channels in Postbase." };
      return { forModel: JSON.stringify(channels) };
    }
    case "list_posts": {
      const status = typeof input.status === "string" && input.status ? input.status : undefined;
      const posts = await listPosts(bot.org_id, status);
      return { forModel: JSON.stringify(posts.slice(0, 25)) };
    }
    case "draft_post": {
      const body = String(input.body ?? "").trim();
      const channelIds = strings(input.channel_ids, 10);
      if (!body) return { forModel: "A draft needs text." };
      const at = typeof input.scheduled_at === "string" && !Number.isNaN(new Date(input.scheduled_at).getTime()) ? new Date(input.scheduled_at).toISOString() : null;
      return {
        forModel: "Draft shown with Save and Schedule buttons. Nothing is posted until the user saves it.",
        card: { type: "draft", body: body.slice(0, 5000), channelIds, scheduledAt: at },
      };
    }
    default:
      return { forModel: `Unknown tool ${name}.` };
  }
}

/** A message as the model reads it: cards become short notes. */
export function historyText(m: BotMessage): string {
  const notes = m.cards.map((c) => {
    if (c.type === "question") return `[Asked: ${c.question} Options: ${c.options.join(" / ")}]`;
    if (c.type === "findings") return `[Findings shown: ${c.items.map((f, i) => `${i + 1}. ${f.title} (${SOURCE_LABEL[f.source]}) ${f.url}`).join("; ")}]`;
    return `[Draft shown: ${c.body.slice(0, 300)}]`;
  });
  return [m.content, ...notes].filter(Boolean).join("\n\n");
}

const MAX_HISTORY_CHARS = 30_000;

/** Stored messages → model history: oldest first, bounded, opening with a user turn. */
export function buildBotHistory(messages: BotMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  let chars = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = historyText(messages[i]);
    if (!text) continue;
    if (chars + text.length > MAX_HISTORY_CHARS) break;
    chars += text.length;
    out.unshift({ role: messages[i].role === "user" ? "user" : "assistant", content: text });
  }
  if (out[0]?.role !== "user") out.unshift({ role: "user", content: "(I just made you.)" });
  return out;
}

export type BotTurnUsage = { input: number; output: number; cacheRead: number; cacheWrite: number; searches: number };

export type BotTurnResult = { text: string; cards: BotCard[]; usage: BotTurnUsage };

/** Run one bot turn, streaming text and cards through `send`. */
export async function runBotTurn(opts: {
  apiKey: string;
  model: string;
  bot: BotRow;
  system: string;
  history: Anthropic.MessageParam[];
  timezone: string;
  send: SendFn;
  /** Save the reply so far as its own message (before a sweep posts its own). */
  persist: (text: string, cards: BotCard[]) => Promise<void>;
}): Promise<BotTurnResult> {
  const anthropic = new Anthropic({ apiKey: opts.apiKey });
  const messages = opts.history.slice();
  const cut = opts.system.indexOf("\n## Context");
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: opts.system.slice(0, cut), cache_control: { type: "ephemeral" } },
    { type: "text", text: opts.system.slice(cut) },
  ];
  let text = "";
  const cards: BotCard[] = [];
  const usage: BotTurnUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0 };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const run = anthropic.messages.stream({
      model: opts.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      tools: BOT_TOOLS,
      messages,
    });
    run.on("text", (delta) => {
      text += delta;
      opts.send({ type: "token", text: delta });
    });
    // Text that resumes after a search is a new paragraph, not a run-on. (Only
    // there: citations also split text into blocks, mid-sentence.)
    let afterSearch = false;
    run.on("streamEvent", (event) => {
      if (event.type !== "content_block_start") return;
      const type = event.content_block.type;
      if (type === "server_tool_use") opts.send({ type: "tool", name: "web_search" });
      if (type === "web_search_tool_result") afterSearch = true;
      if (type === "text" && afterSearch) {
        afterSearch = false;
        if (text.trim() && !/\s$/.test(text)) {
          text += "\n\n";
          opts.send({ type: "token", text: "\n\n" });
        }
      }
    });
    const final = await run.finalMessage();
    usage.input += final.usage.input_tokens ?? 0;
    usage.output += final.usage.output_tokens ?? 0;
    usage.cacheRead += final.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += final.usage.cache_creation_input_tokens ?? 0;
    usage.searches += final.usage.server_tool_use?.web_search_requests ?? 0;
    messages.push({ role: "assistant", content: final.content });

    // A long server-side search can pause the turn; send it back to carry on.
    if (final.stop_reason === "pause_turn") continue;

    const toolUses = final.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (final.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    let stop = false;
    for (const tu of toolUses) {
      opts.send({ type: "tool", name: tu.name });
      if (tu.name === "run_sweep" && (text.trim() || cards.length)) {
        await opts.persist(text.trim(), cards.splice(0));
        text = "";
        opts.send({ type: "flush" });
      }
      let out: ToolOutcome;
      try {
        out = await runTool(opts.bot, tu.name, (tu.input ?? {}) as Record<string, unknown>, { timezone: opts.timezone });
      } catch (e) {
        out = { forModel: e instanceof Error ? e.message : "Tool failed." };
      }
      if (out.card) {
        cards.push(out.card);
        opts.send({ type: "card", card: out.card });
      }
      // A sweep posts its own message; let the client show it in place.
      if (tu.name === "run_sweep") opts.send({ type: "refresh" });
      if (tu.name === "set_identity") opts.send({ type: "identity", name: opts.bot.name });
      if (out.stop) stop = true;
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out.forModel });
    }
    if (stop) break;
    messages.push({ role: "user", content: results });
    // Keep text from separate rounds apart.
    if (text.trim() && !text.endsWith("\n")) {
      text += "\n\n";
      opts.send({ type: "token", text: "\n\n" });
    }
  }
  return { text: text.trim(), cards, usage };
}
