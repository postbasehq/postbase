import { CLIENTS, type AiClient } from "@/lib/seo/clients";
import { LIVE_NETWORKS, type FactUi, type Network } from "@/lib/seo/networks";

/*
 * "Post to <network> from <AI client>" pages: /ai/[client]/[network]. The text
 * networks only (YouTube has its own /mcp/youtube page; TikTok can only be
 * drafted by an agent). Each network has
 * notes on how an agent's post behaves there; each client kind has its own
 * prompts, so no two pages say the same thing.
 */

export const COMBO_CLIENTS = ["claude", "claude-code", "cursor"] as const;
export const COMBO_NETWORKS = ["x", "linkedin", "bluesky", "mastodon"] as const;

type NetworkNotes = {
  /** What "post" means there, for headings: "tweets and threads". */
  what: string;
  /** Each with a big figure and a small product preview (components/marketing/seo/FactUI). */
  notes: { label: string; stat: string; ui: FactUi; value: string }[];
  tips: string[];
  faqs: [string, string][];
};

const NOTES: Record<(typeof COMBO_NETWORKS)[number], NetworkNotes> = {
  x: {
    what: "tweets and threads",
    notes: [
      { label: "Length", stat: "280", ui: { kind: "count", used: 262, limit: 280 }, value: "280 characters per post. Links count as 23 and emoji as 2, so ask for a little under the limit." },
      { label: "Threads", stat: "25 posts", ui: { kind: "thread", parts: 3 }, value: "Ask for a thread and the agent sends the posts as one list. Postbase publishes them as a chain of replies, up to 25." },
      { label: "Timing", stat: "Time or draft", ui: { kind: "schedule" }, value: "Give a time and it's scheduled; leave it out and it's saved as a draft." },
    ],
    tips: [
      "Ask for the hook first: \"make the first post work on its own\".",
      "Put links in the last post of a thread, not the first.",
      "Say how many posts you want. \"A 4-post thread\" beats \"a thread\".",
    ],
    faqs: [
      [
        "Can it post a thread on X?",
        "Yes. Ask for a thread and the agent sends the posts together. Postbase publishes the first at the scheduled time and each following post as a reply to the one before.",
      ],
      [
        "Can it attach images to a tweet?",
        "Not through the agent yet. Ask it to save a draft, then add the image in the Postbase composer and schedule it from there.",
      ],
    ],
  },
  linkedin: {
    what: "LinkedIn posts",
    notes: [
      { label: "Length", stat: "3,000", ui: { kind: "count", used: 1842, limit: 3000 }, value: "Up to 3,000 characters, but only the first few lines show before \"see more\", so the opening matters." },
      { label: "First comment", stat: "Built in", ui: { kind: "firstComment" }, value: "Ask for a two-part post and the second part is published as the first comment, the usual home for links on LinkedIn." },
      { label: "Hashtags", stat: "Plain text", ui: { kind: "text", words: ["#hiring", "#design"], linked: false }, value: "Postbase posts your text exactly as written, so hashtags and @mentions show as plain text rather than links." },
    ],
    tips: [
      "Ask for short paragraphs and no emoji bullets unless that's your style.",
      "Put the link in a second part so it becomes the first comment.",
      "Give it a real example of a past post you liked, so it matches your voice.",
    ],
    faqs: [
      [
        "Can it post to a LinkedIn company page?",
        "Not yet. Postbase posts to personal LinkedIn profiles today; company pages are on the roadmap.",
      ],
      [
        "How do I get a link in the first comment?",
        "Ask for a two-part post with the link in the second part. Postbase publishes the first part as the post and the second as its first comment.",
      ],
    ],
  },
  bluesky: {
    what: "Bluesky posts and threads",
    notes: [
      { label: "Length", stat: "300", ui: { kind: "count", used: 268, limit: 300 }, value: "300 characters per post, counted the way you'd count them by eye." },
      { label: "Links", stat: "Clickable", ui: { kind: "text", words: ["postbase.so/blog"], linked: true }, value: "Bluesky doesn't make links clickable on its own. Postbase does it for you when the post goes out." },
      { label: "Threads", stat: "Threads", ui: { kind: "thread", parts: 3 }, value: "Ask for a thread and each post is published as a reply to the one before, in order." },
    ],
    tips: [
      "Bluesky is a little more casual than LinkedIn. Tell the agent the tone you want.",
      "Ask for one version for X and one for Bluesky rather than sharing text: the limits differ (280 vs 300).",
      "Keep links at the end of a post so the preview reads well.",
    ],
    faqs: [
      [
        "Do links in the agent's posts work on Bluesky?",
        "Yes. Postbase adds the link markup Bluesky needs when it publishes, so links are clickable.",
      ],
      [
        "Can it post the same thing to X and Bluesky?",
        "Yes. It can send one post to both channels, or a separate version to each. Separate versions usually read better.",
      ],
    ],
  },
  mastodon: {
    what: "Mastodon posts and threads",
    notes: [
      { label: "Length", stat: "500", ui: { kind: "count", used: 412, limit: 500 }, value: "500 characters per post, the default on most instances." },
      { label: "Instances", stat: "Any server", ui: { kind: "server" }, value: "Works with any server you've connected in Postbase: mastodon.social, fosstodon.org or your own." },
      { label: "Threads", stat: "Threads", ui: { kind: "thread", parts: 3 }, value: "Ask for a thread and each post is published as a reply to the one before." },
    ],
    tips: [
      "Mastodon readers expect plain, human posts. Ask for no marketing language.",
      "Use a few relevant hashtags at the end: they're how people find posts on Mastodon.",
      "Ask for a separate, shorter version for X rather than sharing the 500-character text.",
    ],
    faqs: [
      [
        "Does it work with my Mastodon instance?",
        "Yes. Connect your account in Postbase with your instance URL and an access token, and the agent can post to it like any other channel.",
      ],
      [
        "Can it post to Mastodon and Bluesky together?",
        "Yes. Ask for both, and it can send one post to both channels or a separate version to each.",
      ],
    ],
  },
};

type Kind = AiClient["kind"];

const PROMPTS: Record<Kind, Record<(typeof COMBO_NETWORKS)[number], string[]>> = {
  chat: {
    x: [
      "Turn this article into a 5-post X thread and schedule it for Tuesday at 9am.",
      "Write three standalone X posts from these notes and space them a day apart.",
      "What's scheduled on X this week? Cancel anything going out on Friday.",
    ],
    linkedin: [
      "Write a LinkedIn post about our new hire. Put the link to the job page in the first comment. Schedule it for Monday at 8am.",
      "Turn this customer story into a LinkedIn post in my voice. Here's a post of mine I liked: …",
      "Save a LinkedIn draft about the conference next week so I can add a photo.",
    ],
    bluesky: [
      "Write a short Bluesky post announcing the new episode and schedule it for 6pm.",
      "Make a 3-post Bluesky thread from this blog post and save it as a draft.",
      "Post the same announcement to X and Bluesky, with a version sized for each.",
    ],
    mastodon: [
      "Write a plain, friendly Mastodon post about our open-source release, with two relevant hashtags.",
      "Turn these release notes into a short Mastodon thread and schedule it for 10am.",
      "What have I got scheduled on Mastodon this week?",
    ],
  },
  terminal: {
    x: [
      "Read CHANGELOG.md and write an X thread for the v2.3 release. Schedule it for 10am tomorrow.",
      "Summarise the commits since the last tag as one X post and save it as a draft.",
      "Post a short 'we're live' note to X as soon as this deploy finishes.",
    ],
    linkedin: [
      "Write a LinkedIn post about the performance work in this release, with the benchmark numbers from bench/results.md. Link in the first comment.",
      "Turn docs/launch.md into a LinkedIn post and schedule it for Tuesday at 8am.",
      "Draft a LinkedIn post thanking the contributors in this release.",
    ],
    bluesky: [
      "Write a Bluesky post for the release, under 300 characters, and schedule it with the X post.",
      "Turn the top three items in CHANGELOG.md into a 3-post Bluesky thread.",
      "List what's scheduled on Bluesky for launch week.",
    ],
    mastodon: [
      "Announce the release on Mastodon in plain language, with #opensource and the project hashtag.",
      "Write a Mastodon thread explaining the breaking change in this release and how to migrate.",
      "Cancel the Mastodon post scheduled for 3pm; the version number is wrong.",
    ],
  },
  editor: {
    x: [
      "Look at the diff for this PR and write an X post about the new feature. Schedule it for tomorrow at noon.",
      "Turn the README's feature list into a 4-post X thread and save it as a draft.",
      "What's scheduled on X for launch day?",
    ],
    linkedin: [
      "Write a LinkedIn post about the feature in this file, aimed at non-developers. Link to the docs in the first comment.",
      "Draft a LinkedIn post about why we rewrote this module, using the notes in docs/decisions/.",
      "Schedule the LinkedIn launch post for Thursday at 9am.",
    ],
    bluesky: [
      "Write a Bluesky post about the fix in this branch and schedule it for 5pm.",
      "Make one version of this announcement for X and one for Bluesky.",
      "Save a Bluesky draft about the new CLI flag.",
    ],
    mastodon: [
      "Write a Mastodon post about the new plugin API, with a code-free explanation.",
      "Turn this changelog entry into a Mastodon thread and schedule it for tomorrow.",
      "List my scheduled Mastodon posts.",
    ],
  },
};

export type Combo = { client: AiClient; network: Network; notes: NetworkNotes; prompts: string[] };

export function getCombo(clientSlug: string, networkSlug: string): Combo | null {
  if (!(COMBO_CLIENTS as readonly string[]).includes(clientSlug)) return null;
  if (!(COMBO_NETWORKS as readonly string[]).includes(networkSlug)) return null;
  const client = CLIENTS.find((c) => c.slug === clientSlug);
  const network = LIVE_NETWORKS.find((n) => n.slug === networkSlug);
  if (!client || !network) return null;
  const key = networkSlug as (typeof COMBO_NETWORKS)[number];
  return { client, network, notes: NOTES[key], prompts: PROMPTS[client.kind][key] };
}

export const ALL_COMBOS = COMBO_CLIENTS.flatMap((c) => COMBO_NETWORKS.map((n) => ({ client: c, network: n })));
