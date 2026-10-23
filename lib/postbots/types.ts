/*
 * Shared shapes for Postbots: what a bot is, how its listening is set up, and
 * the cards its messages carry. Safe to import from client components.
 *
 * A bot has no fixed type: you create a blank one and tell it its job in chat.
 * What it can actually do comes from the skills in code (lib/postbots/chat.ts).
 */

export type BotStatus = "setup" | "active" | "paused";

/** Solid brand colours only (no tints): a bot's avatar fill. */
export const BOT_COLORS = {
  blue: "#2b59d9",
  amber: "#e3a72c",
  red: "#d14a3e",
  white: "#ffffff",
  black: "#202124",
  // Older bots only; new ones never get these.
  green: "#188038",
  gray: "#8a8f98",
} as const;
export type BotColor = keyof typeof BOT_COLORS;

/** The Postbots palette (assets/postbots), cycled through as bots are made. */
export const NEW_BOT_COLORS: BotColor[] = ["blue", "amber", "red", "white", "black"];

export const LISTEN_SOURCES = ["hackernews", "reddit", "bluesky", "news"] as const;
export type ListenSource = (typeof LISTEN_SOURCES)[number];

export const SOURCE_LABEL: Record<ListenSource, string> = {
  hackernews: "Hacker News",
  reddit: "Reddit",
  bluesky: "Bluesky",
  news: "Google News",
};

/** Everything a bot has agreed to do. Listening fields sit at the top level. */
export type BotConfig = Partial<ListenConfig> & {
  /** The bot's job in one line, in its own words (e.g. "Finds distribution openings among Postbase's competitors"). */
  job?: string;
  /** The person named the bot themselves, so it keeps that name. */
  namedByUser?: boolean;
};

export type ListenConfig = {
  /** Phrases to look for (brand, product, competitor or topic). */
  keywords: string[];
  /** Phrases that mark a result as someone else's (e.g. a namesake product). */
  exclude: string[];
  sources: ListenSource[];
  /** Local check times, "HH:MM", in `timezone`. */
  times: string[];
  weekdaysOnly: boolean;
  timezone: string;
  /** Free-text notes the bot keeps about what matters to you. */
  focus?: string;
};

export type Bot = {
  id: string;
  name: string;
  color: BotColor;
  status: BotStatus;
  config: BotConfig;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastReadAt: string;
  updatedAt: string;
};

/** A question the bot asks with tap-to-answer options. */
export type QuestionCard = {
  type: "question";
  question: string;
  options: string[];
  multiSelect: boolean;
};

export type Finding = {
  source: ListenSource;
  url: string;
  title: string;
  author: string | null;
  /** Why the bot thinks it matters, in one line. */
  why: string;
  kind: "mention" | "conversation" | "lead" | "news";
  /** What the bot suggests: reply in the thread, or post about it. */
  action: "reply" | "post" | "none";
  publishedAt: string | null;
};

export type FindingsCard = { type: "findings"; items: Finding[] };

/** A post the bot drafted; the human saves or schedules it into Postbase. */
export type DraftCard = {
  type: "draft";
  body: string;
  channelIds: string[];
  scheduledAt: string | null;
};

/**
 * A change in a connected app (send, post, create, edit) that Composio held
 * back: it runs only if someone in the workspace clicks Approve.
 */
export type AppActionCard = {
  type: "app_action";
  /** What would run, as Composio describes it. */
  summary: string;
  status: "pending" | "done" | "denied" | "failed";
  /** What happened, once answered. */
  outcome?: string;
  /** The paused call. Server use only, and useless without our Composio key. */
  call: { sessionId: string; slug: string; arguments: Record<string, unknown>; requestState: string; requestIds: string[] };
};

/** A routine the bot proposed; it's saved switched off until someone turns it on. */
export type RoutineCard = {
  type: "routine";
  routineId: string;
  /** When it runs and what it does, in words. */
  summary: string;
  status: "pending" | "on" | "discarded";
};

export type BotCard = QuestionCard | FindingsCard | DraftCard | AppActionCard | RoutineCard;

export type BotMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  cards: BotCard[];
  createdAt: string;
};

/** A job a bot does on a schedule (bot_routines). */
export type Routine = {
  id: string;
  instruction: string;
  /** 0 = Sunday … 6 = Saturday; empty means every day. */
  days: number[];
  times: string[];
  timezone: string;
  active: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
};
