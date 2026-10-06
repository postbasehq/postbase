/*
 * The hero demo's script per page (components/marketing/seo/McpDemo.tsx). The demo
 * calendar's week is Mon 21 to Sun 27 Sep with Wednesday as today, so "tomorrow at
 * 9" is Thursday 09:00.
 */

export type McpScene = {
  ask: string;
  /** Tool calls in order; the last create_post shows its summary card. */
  tools: string[];
  card: { chans: string[]; what: string };
  reply: string;
  body: string;
};

export const MCP_WHEN = "Thu 24 Sep, 09:00";
export const MCP_LANDING = { day: 3, hour: 9, minute: 0 };

export const MCP_SCENES: Record<string, McpScene> = {
  hub: {
    ask: "Turn this week's changelog into an X thread and a LinkedIn post, and schedule both for 9am tomorrow",
    tools: ["list_channels", "create_post", "create_post"],
    card: { chans: ["x", "linkedin"], what: "X thread (4 posts) and LinkedIn post" },
    reply: "Done. The X thread and the LinkedIn post are both scheduled for 9:00 tomorrow, and they're on your Postbase calendar.",
    body: "This week in Fieldnote: offline mode, faster sync and a new export.",
  },
  x: {
    ask: "Write a 4-post X thread from these release notes and schedule it for 9am tomorrow",
    tools: ["list_channels", "create_post"],
    card: { chans: ["x"], what: "Thread, 4 posts" },
    reply: "Scheduled. The thread goes out on X at 9:00 tomorrow, each post as a reply to the one before.",
    body: "Fieldnote 2.4 is out. Here's what changed 🧵",
  },
  linkedin: {
    ask: "Write a LinkedIn post about our new hire, put the job link in the first comment, and schedule it for 9am tomorrow",
    tools: ["list_channels", "create_post"],
    card: { chans: ["linkedin"], what: "Post with a first comment" },
    reply: "Scheduled for 9:00 tomorrow on LinkedIn. The job link goes in the first comment.",
    body: "We're hiring our first designer. Here's what the role looks like.",
  },
  bluesky: {
    ask: "Post this announcement to Bluesky and X at 9am tomorrow, with a version sized for each",
    tools: ["list_channels", "create_post", "create_post"],
    card: { chans: ["bluesky", "x"], what: "One version per network" },
    reply: "Both are scheduled for 9:00 tomorrow: 280 characters for X and a longer cut for Bluesky.",
    body: "Fieldnote now syncs offline notes the moment you're back online.",
  },
  mastodon: {
    ask: "Write a plain Mastodon thread about our open-source release, with two hashtags, for 9am tomorrow",
    tools: ["list_channels", "create_post"],
    card: { chans: ["mastodon"], what: "Thread, 2 posts" },
    reply: "Scheduled on Mastodon for 9:00 tomorrow, with #opensource and #fieldnote at the end.",
    body: "Fieldnote is now open source under AGPL-3.0. #opensource",
  },
};
