import { MCP_URL } from "@/lib/seo/clients";
import { API_LIMITS } from "@/lib/api-limits";
import { X_LINK_LIMIT } from "@/lib/plans";
import type { FactUi } from "@/lib/seo/networks";

/*
 * The MCP server pages: /mcp (the server itself: endpoint, sign-in, tools and
 * limits) and /mcp/[network] (what each tool does on one network, with example
 * calls). The /ai pages cover setup in each AI tool; these are the reference.
 * Facts mirror app/api/mcp/route.ts and lib/api-core.ts; keep them in sync.
 * Text networks only, because the tools post text and threads (no media).
 */

export { MCP_URL };

export const MCP_TOOLS: { name: string; kind: "read" | "write"; summary: string; args: string }[] = [
  {
    name: "list_channels",
    kind: "read",
    summary: "The accounts connected to the workspace: id, network, handle and status. The agent calls it first to get channel ids.",
    args: "No arguments.",
  },
  {
    name: "create_post",
    kind: "write",
    summary:
      "Saves a draft, or schedules a post or a thread, on one or more channels. The post lands on your Postbase calendar and publishes through each network's official API.",
    args: "body or thread, channel_ids, and scheduled_at (ISO 8601 with an offset) or schedule_in_minutes. Leave both times out to save a draft.",
  },
  {
    name: "list_scheduled",
    kind: "read",
    summary: "Posts in the workspace with their text, time and channels. Scheduled posts by default, or drafts, published or failed ones.",
    args: "status (optional): scheduled, draft, published or failed.",
  },
  {
    name: "cancel_post",
    kind: "write",
    summary: "Cancels a scheduled post before it goes out. It goes back to being a draft, so nothing is deleted.",
    args: "post_id, from list_scheduled.",
  },
];

/** The server at a glance, as solid brand tiles. */
export const MCP_GLANCE: { label: string; stat: string; value: string; tone: "blue" | "amber" | "red" }[] = [
  { label: "Endpoint", stat: "mcp.postbase.so", value: "Hosted for you over Streamable HTTP. There's nothing to install or run.", tone: "blue" },
  {
    label: "Sign-in",
    stat: "OAuth",
    value: "Sign in with Postbase and pick one workspace, or use an API key. Revoke either from the AI & API page at any time.",
    tone: "amber",
  },
  {
    label: "Limits",
    stat: `${API_LIMITS.postsPerHour} posts an hour`,
    value: `And ${API_LIMITS.requestsPerMinute} requests a minute per workspace, shared with the REST API.`,
    tone: "red",
  },
];

export const MCP_FAQS: [string, string][] = [
  [
    "What is the Postbase MCP server?",
    "A hosted Model Context Protocol server that lets AI tools like Claude, ChatGPT, Cursor and Claude Code list your social channels, save drafts, schedule posts and threads, and cancel scheduled posts. Everything it creates shows up on your Postbase calendar.",
  ],
  [
    "Which networks can an AI post to through it?",
    "X, LinkedIn, Bluesky and Mastodon. The tools send text and threads, so TikTok and YouTube, which need a video, can only be saved as drafts: add the video in Postbase and schedule it from there.",
  ],
  [
    "Do I need an API key?",
    `No. Add ${MCP_URL} to your AI tool and sign in with Postbase. If your tool can't do OAuth, create an API key on the AI & API page and run the server locally with npx @postbasehq/mcp.`,
  ],
  [
    "Can the agent delete posts?",
    "No. It can create drafts and scheduled posts, list them and cancel a scheduled one, which turns it back into a draft. There's no tool that deletes anything or publishes past your review of the calendar.",
  ],
  [
    "Is it open source?",
    "Yes. The npm package is at github.com/postbasehq/mcp and the hosted server is part of the Postbase app at github.com/postbasehq/postbase, both under AGPL-3.0. It's also in the official MCP registry as io.github.postbasehq/postbase.",
  ],
  [
    "Is there a free plan?",
    "Every plan starts with a 7-day free trial and includes the MCP server and API. Drafts work without a plan; scheduling needs an active plan or trial.",
  ],
];

export type McpNetwork = {
  slug: "x" | "linkedin" | "bluesky" | "mastodon";
  metaTitle: string;
  metaDescription: string;
  h1: [string, string];
  sub: string;
  /** How create_post behaves on this network, each with a small product preview. */
  behaviour: { label: string; stat: string; ui: FactUi; value: string }[];
  /** What gets refused or flagged when the agent calls the tool. */
  checks: { label: string; value: string }[];
  faqs: [string, string][];
};

const xLinks = `${X_LINK_LIMIT.creator} to ${X_LINK_LIMIT.agency}`;

export const MCP_NETWORKS: McpNetwork[] = [
  {
    slug: "x",
    metaTitle: "X (Twitter) MCP server: post tweets and threads",
    metaDescription:
      "A hosted X MCP server for Claude, ChatGPT and Cursor: schedule tweets and threads through X's official API. OAuth sign-in, no X developer account needed.",
    h1: ["The X", "MCP server"],
    sub: "Let Claude, ChatGPT, Cursor or any MCP client schedule tweets and threads on X through the official API, without an X developer account of your own.",
    behaviour: [
      { label: "Length", stat: "280", ui: { kind: "count", used: 262, limit: 280 }, value: "Characters per post, counted the way X counts: links are 23 and most emoji are 2." },
      { label: "Threads", stat: "25 posts", ui: { kind: "thread", parts: 3 }, value: "Send a thread array and Postbase publishes it as a chain of replies." },
      { label: "Links", stat: `${xLinks} a month`, ui: { kind: "count", used: 18, limit: X_LINK_LIMIT.creator, what: "Posts with links" }, value: "X charges per post with a link, so those are capped by plan. Plain posts and threads are unlimited." },
      { label: "API access", stat: "Included", ui: { kind: "account" }, value: "Postbase posts through its own X API app, so you don't need X API keys or a paid developer tier." },
    ],
    checks: [
      { label: "Too long", value: "A scheduled post over 280 weighted characters is refused when the agent calls the tool, with the reason, so it can shorten it." },
      { label: "In the past", value: "A time in the past is refused rather than posted straight away." },
      { label: "Link allowance", value: "Near the monthly link allowance, the call returns a warning the agent can pass on. Linked posts past the allowance aren't sent until it resets." },
    ],
    faqs: [
      [
        "Do I need an X developer account?",
        "No. You connect your X account to Postbase with X's own sign-in, and Postbase publishes through its API app. The AI tool only ever talks to Postbase.",
      ],
      [
        "Can it attach images or video to a tweet?",
        "Not through the MCP tools yet. Ask the agent to save a draft, add the media in the Postbase composer and schedule it from there.",
      ],
      [
        "Can it reply to or like other people's posts?",
        "No. The server schedules your own posts and threads. There are no tools for replies to others, likes, follows or DMs.",
      ],
    ],
  },
  {
    slug: "linkedin",
    metaTitle: "LinkedIn MCP server: schedule posts from AI",
    metaDescription:
      "A hosted LinkedIn MCP server: let Claude, ChatGPT or Cursor schedule LinkedIn posts with a first comment through LinkedIn's official API. OAuth sign-in.",
    h1: ["The LinkedIn", "MCP server"],
    sub: "Let Claude, ChatGPT, Cursor or any MCP client write and schedule LinkedIn posts, with the link in the first comment, through LinkedIn's official API.",
    behaviour: [
      { label: "Length", stat: "3,000", ui: { kind: "count", used: 1842, limit: 3000 }, value: "Characters per post. Only the first few lines show before \"see more\"." },
      { label: "First comment", stat: "Built in", ui: { kind: "firstComment" }, value: "Send two parts as a thread and the second is published as the post's first comment." },
      { label: "Profiles", stat: "Personal", ui: { kind: "account" }, value: "Posts go out from your own profile. Company pages aren't supported yet." },
    ],
    checks: [
      { label: "Too long", value: "A scheduled post over 3,000 characters is refused when the agent calls the tool, with the reason." },
      { label: "In the past", value: "A time in the past is refused rather than posted straight away." },
      { label: "Expired accounts", value: "Disconnected or expired LinkedIn channels show their status in list_channels, so the agent can tell you to reconnect." },
    ],
    faqs: [
      [
        "Does the AI need my LinkedIn password?",
        "No. You connect LinkedIn to Postbase with LinkedIn's own sign-in. Your AI tool signs in to Postbase, not LinkedIn, and you can revoke it at any time.",
      ],
      [
        "Can it post to a company page?",
        "Not yet. Postbase posts to personal LinkedIn profiles today; company pages are on the roadmap.",
      ],
      [
        "Can it add images to LinkedIn posts?",
        "Not through the MCP tools. Ask for a draft, add images in the Postbase composer and schedule from there.",
      ],
    ],
  },
  {
    slug: "bluesky",
    metaTitle: "Bluesky MCP server: post and schedule from AI",
    metaDescription:
      "A hosted Bluesky MCP server: let Claude, ChatGPT or Cursor schedule Bluesky posts and threads, with clickable links, through the AT Protocol. OAuth sign-in.",
    h1: ["The Bluesky", "MCP server"],
    sub: "Bluesky has no built-in scheduling. Let Claude, ChatGPT, Cursor or any MCP client schedule Bluesky posts and threads through the AT Protocol instead.",
    behaviour: [
      { label: "Length", stat: "300", ui: { kind: "count", used: 268, limit: 300 }, value: "Characters per post, counted as you'd count them by eye. Links are made clickable for you." },
      { label: "Threads", stat: "Threads", ui: { kind: "thread", parts: 3 }, value: "Send a thread array and each post is published as a reply to the one before." },
      { label: "Connecting", stat: "App password", ui: { kind: "password" }, value: "Connect Bluesky to Postbase with your handle and an app password, not your main password." },
    ],
    checks: [
      { label: "Too long", value: "A scheduled post over 300 characters is refused when the agent calls the tool, with the reason." },
      { label: "Two networks", value: "When one call targets X and Bluesky, every post has to fit both limits. Separate calls give each network its own version." },
      { label: "In the past", value: "A time in the past is refused rather than posted straight away." },
    ],
    faqs: [
      [
        "Does Bluesky have its own scheduling?",
        "No, the Bluesky app can't schedule posts. Postbase holds the post and publishes it at the time you set, through the AT Protocol.",
      ],
      [
        "Are links in the agent's posts clickable?",
        "Yes. Postbase adds the link facets Bluesky needs when it publishes.",
      ],
      [
        "Can it post images to Bluesky?",
        "Not through the MCP tools. Save a draft, add up to four images in the Postbase composer and schedule it there.",
      ],
    ],
  },
  {
    slug: "mastodon",
    metaTitle: "Mastodon MCP server for any instance",
    metaDescription:
      "A hosted Mastodon MCP server that works with any instance: let Claude, ChatGPT or Cursor schedule Mastodon posts and threads. OAuth sign-in, no self-hosting.",
    h1: ["The Mastodon", "MCP server"],
    sub: "Let Claude, ChatGPT, Cursor or any MCP client schedule posts and threads on any Mastodon instance, from mastodon.social to your own server.",
    behaviour: [
      { label: "Length", stat: "500", ui: { kind: "count", used: 412, limit: 500 }, value: "Characters per post, the default on most instances. Hashtags work as you type them." },
      { label: "Instances", stat: "Any server", ui: { kind: "server" }, value: "Works with any instance you've connected: mastodon.social, fosstodon.org or your own." },
      { label: "Threads", stat: "Threads", ui: { kind: "thread", parts: 3 }, value: "Send a thread array and each post is published as a reply to the one before." },
    ],
    checks: [
      { label: "Too long", value: "A scheduled post over 500 characters is refused when the agent calls the tool, with the reason." },
      { label: "In the past", value: "A time in the past is refused rather than posted straight away." },
      { label: "Drafts", value: "Leave out the time and the post is saved as a draft for you to check first." },
    ],
    faqs: [
      [
        "Does it work with my instance?",
        "Yes. Connect your Mastodon account to Postbase with your instance URL and approve it on your server, and the agent can post to it like any other channel.",
      ],
      [
        "Do I have to run the MCP server myself?",
        "No. The server is hosted at mcp.postbase.so. If you'd rather self-host everything, Postbase and its MCP package are open source.",
      ],
      [
        "Can it boost or reply to other posts?",
        "No. It schedules your own posts and threads only. There are no tools for boosts, favourites, replies to others or DMs.",
      ],
    ],
  },
];

export const mcpNetwork = (slug: string) => MCP_NETWORKS.find((n) => n.slug === slug);

export { MCP_SCENES, type McpScene } from "@/lib/seo/mcp-scenes";
