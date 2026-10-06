import { MCP_URL } from "@/lib/seo/clients";
import { API_LIMITS } from "@/lib/api-limits";
import { X_LINK_LIMIT } from "@/lib/plans";

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

export const MCP_FACTS = [
  { label: "Endpoint", value: `${MCP_URL}, over Streamable HTTP.` },
  { label: "Sign-in", value: "OAuth (\"Sign in with Postbase\"), so there's no key to paste. Or an API key from the AI & API page." },
  { label: "Scope", value: "Each connection is tied to one workspace. Revoke it from the AI & API page at any time." },
  {
    label: "Limits",
    value: `${API_LIMITS.postsPerHour} posts an hour and ${API_LIMITS.requestsPerMinute} requests a minute per workspace, shared with the REST API.`,
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
  /** An example create_post call, as the agent would send it. */
  example: { caption: string; args: Record<string, unknown> };
  /** How create_post behaves on this network. */
  behaviour: { label: string; value: string }[];
  /** What gets refused, and why. */
  checks: string[];
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
    example: {
      caption: "A three-post thread, scheduled for 9am UK time",
      args: {
        thread: [
          "We just shipped scheduled threads in Postbase.",
          "Write the whole thread once, pick a time, and each post goes out as a reply to the one before.",
          "Try it free for 7 days: postbase.so",
        ],
        channel_ids: ["<your X channel id>"],
        scheduled_at: "2026-10-07T09:00:00+01:00",
      },
    },
    behaviour: [
      { label: "Length", value: "280 characters per post, counted the way X counts: links are 23 and most emoji are 2." },
      { label: "Threads", value: "Send a thread array and Postbase publishes it as a chain of replies, up to 25 posts." },
      { label: "Links", value: `X charges per post with a link, so those are capped at ${xLinks} a month depending on plan. Plain posts and threads are unlimited.` },
      { label: "API access", value: "Postbase posts through its own X API app, so you don't need X API keys or a paid X developer tier." },
    ],
    checks: [
      "A scheduled post over 280 weighted characters is refused when the agent calls the tool, with the reason, so it can shorten it.",
      "A time in the past is refused rather than posted straight away.",
      "Near the monthly link allowance, the call returns a warning the agent can pass on. Linked posts past the allowance aren't sent until it resets.",
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
    example: {
      caption: "A post with its link in the first comment",
      args: {
        thread: [
          "We spent three months making scheduling boring. Here's what we learned about time zones, retries and LinkedIn's API.",
          "The full write-up: postbase.so/blog",
        ],
        channel_ids: ["<your LinkedIn channel id>"],
        scheduled_at: "2026-10-08T08:30:00+01:00",
      },
    },
    behaviour: [
      { label: "Length", value: "Up to 3,000 characters. Only the first few lines show before \"see more\"." },
      { label: "First comment", value: "Send two parts as a thread and the second is published as the post's first comment." },
      { label: "Text", value: "Posted exactly as written. Hashtags and @mentions appear as plain text, not links." },
      { label: "Profiles", value: "Posts go to personal LinkedIn profiles. Company pages aren't supported yet." },
    ],
    checks: [
      "A scheduled post over 3,000 characters is refused when the agent calls the tool, with the reason.",
      "A time in the past is refused rather than posted straight away.",
      "Disconnected or expired LinkedIn channels show their status in list_channels, so the agent can tell you to reconnect.",
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
    example: {
      caption: "The same announcement to X and Bluesky at once",
      args: {
        body: "Postbase now schedules Bluesky threads, with clickable links: postbase.so/integrations/bluesky",
        channel_ids: ["<your Bluesky channel id>", "<your X channel id>"],
        schedule_in_minutes: 30,
      },
    },
    behaviour: [
      { label: "Length", value: "300 characters per post, counted as you'd count them by eye." },
      { label: "Links", value: "Bluesky needs extra markup to make a link clickable. Postbase adds it when the post goes out." },
      { label: "Threads", value: "Send a thread array and each post is published as a reply to the one before." },
      { label: "Connecting", value: "Connect Bluesky to Postbase with your handle and an app password, not your main password." },
    ],
    checks: [
      "A scheduled post over 300 characters is refused when the agent calls the tool, with the reason.",
      "When one call targets X and Bluesky, every post has to fit both limits. Separate calls give each network its own version.",
      "A time in the past is refused rather than posted straight away.",
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
    example: {
      caption: "A short release thread, saved as a draft to review",
      args: {
        thread: [
          "Postbase 1.2 is out: threads on Mastodon, Bluesky and X from one draft. #opensource",
          "It's AGPL-3.0 and self-hostable. Code: github.com/postbasehq/postbase",
        ],
        channel_ids: ["<your Mastodon channel id>"],
      },
    },
    behaviour: [
      { label: "Length", value: "500 characters per post, the default on most instances." },
      { label: "Instances", value: "Works with any instance you've connected: mastodon.social, fosstodon.org or your own." },
      { label: "Threads", value: "Send a thread array and each post is published as a reply to the one before." },
      { label: "Hashtags", value: "Posted as written, so hashtags work the way they do when you type them." },
    ],
    checks: [
      "A scheduled post over 500 characters is refused when the agent calls the tool, with the reason.",
      "A time in the past is refused rather than posted straight away.",
      "Leave out the time and the post is saved as a draft for you to check first.",
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
