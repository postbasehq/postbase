/*
 * Networks Postbase publishes to. Drives /integrations, /integrations/[slug]
 * and the sitemap. Limits and capabilities mirror the composer
 * (components/PostForm.tsx) and the publish adapters (lib/publish/adapters.ts);
 * keep them in sync. `live: false` networks are listed as coming soon and get
 * no page until they are.
 */

export type Network = {
  slug: string;
  /** BrandTile id. */
  id: string;
  name: string;
  live: boolean;
  /** What you schedule there, for headings: "tweets", "TikTok videos". */
  noun?: string;
  /** Composer character limit (per post for thread networks). */
  limit: number;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: [string, string];
  sub: string;
  /** Short line for hub cards. */
  blurb: string;
  facts: { label: string; value: string }[];
  /** The composer shot: this network's cut of the example post, plus media. */
  demo: { text: string; media?: "video" | "images" };
  /** Tile copy: calendar, agent, and the network-specific feature. */
  tiles: { calendar: string; agent: string; agentPrompt: string; special: { label: string; title: string; body: string } };
  steps: { title: string; body: string }[];
  faqs: [string, string][];
};

const CONNECT_OAUTH = (name: string) => ({
  title: `Connect ${name}`,
  body: `Open Channels in Postbase, pick ${name} and approve access on ${name}'s own sign-in screen. Postbase never sees your password.`,
});

const WRITE_STEP = (name: string, extra: string) => ({
  title: "Write the post",
  body: `Open the composer and write once for all your channels, then switch to the ${name} tab to change the wording just for ${name}. ${extra}`,
});

const SCHEDULE_STEP = {
  title: "Pick a time and schedule",
  body: "Choose a date and time, or start from an open slot on the calendar. Postbase publishes it on time and retries if the network has a hiccup.",
};

const FREE_TRIAL_FAQ: [string, string] = [
  "Is there a free trial?",
  "Yes. Every plan starts with 7 days free and includes every network, the MCP server and the API. Or self-host the open-source version for free with your own API keys.",
];

export const NETWORKS: Network[] = [
  {
    slug: "x",
    id: "x",
    name: "X",
    live: true,
    noun: "tweets",
    limit: 280,
    metaTitle: "X (Twitter) scheduler: schedule tweets and threads",
    metaDescription:
      "Schedule tweets and threads to X with images and video. Write once for X, LinkedIn and Bluesky, see every post on one calendar, or let Claude schedule them for you over MCP.",
    eyebrow: "X (Twitter) scheduler",
    h1: ["Schedule tweets and", "threads"],
    sub: "Write a post or a thread once, fit it to X's 280 characters, and schedule it next to everything else you're posting this week.",
    blurb: "Tweets and threads up to 25 posts, with images and video.",
    facts: [
      { label: "Characters", value: "280 per post, counted live as you type" },
      { label: "Threads", value: "Up to 25 posts, published in order as replies" },
      { label: "Media", value: "Images and video, uploaded through X's API" },
      { label: "Also posts to", value: "LinkedIn, Bluesky and Mastodon from the same draft" },
    ],
    demo: {
      text: "New on the shelf: Kochere, Ethiopia ☕️ Apricot, black tea and a little bergamot. 40 bags, roasted Monday.",
    },
    tiles: {
      calendar: "Your tweets sit on the same calendar as every other network. Click an open slot to write a post for that time.",
      agent: "Tell the built-in agent what you want to say. It writes the X cut, keeps it under 280 characters and schedules it.",
      agentPrompt: "Turn our Kochere launch notes into a 3-post X thread for Wednesday at noon.",
      special: {
        label: "Threads",
        title: "Threads without the copy-paste",
        body: "Add posts to a thread in the composer and reorder them by dragging. Postbase publishes each one as a reply to the last, in order.",
      },
    },
    steps: [
      CONNECT_OAUTH("X"),
      WRITE_STEP("X", "Click Add post to turn it into a thread."),
      SCHEDULE_STEP,
    ],
    faqs: [
      [
        "Can I schedule a thread on X?",
        "Yes. Add up to 25 posts to a thread in the composer. Postbase publishes the first post at the scheduled time and each following post as a reply to the one before.",
      ],
      [
        "Can I schedule tweets with images or video?",
        "Yes. Attach images or a video in the composer, or pick them from your media library. Postbase uploads them to X when the post goes out.",
      ],
      [
        "Can I post the same thing to X and Bluesky?",
        "Yes. Pick both channels, write once, then open the Bluesky tab if you want different wording there. X allows 280 characters per post and Bluesky 300.",
      ],
      [
        "Can AI schedule my tweets?",
        "Yes. Use the Postbase agent inside the app, or connect Claude, Cursor or another MCP client and ask it to schedule posts for you. Everything it schedules shows up in your calendar first.",
      ],
      FREE_TRIAL_FAQ,
    ],
  },
  {
    slug: "linkedin",
    id: "linkedin",
    name: "LinkedIn",
    live: true,
    noun: "LinkedIn posts",
    limit: 3000,
    metaTitle: "LinkedIn post scheduler: schedule LinkedIn posts",
    metaDescription:
      "Schedule LinkedIn posts with images and a first comment. Write once for LinkedIn, X and Bluesky, plan the week on one calendar, or let Claude write and schedule posts over MCP.",
    eyebrow: "LinkedIn post scheduler",
    h1: ["Schedule LinkedIn posts", "in minutes"],
    sub: "Write the long version for LinkedIn and the short one for everywhere else in one go, then schedule the week from a single calendar.",
    blurb: "Posts up to 3,000 characters with images and a first comment.",
    facts: [
      { label: "Characters", value: "3,000 per post, counted live as you type" },
      { label: "First comment", value: "Extra parts publish as the first comment under your post" },
      { label: "Images", value: "Up to 20 images per post" },
      { label: "Accounts", value: "Your personal LinkedIn profile" },
    ],
    demo: {
      text:
        "We've added a new single origin: Kochere, from southern Ethiopia.\n\nIt's a washed, light roast with apricot, black tea and bergamot in the cup. We roast in small batches every Monday, so there are 40 bags this week.",
      media: "images",
    },
    tiles: {
      calendar: "See your LinkedIn posts next to X, Bluesky and the rest, and keep a steady rhythm without a spreadsheet.",
      agent: "Ask the built-in agent for a LinkedIn post. It writes the longer version for LinkedIn and a tighter cut for X.",
      agentPrompt: "Write a LinkedIn post about our new Kochere roast for Tuesday at 9am, with a short version for X.",
      special: {
        label: "First comment",
        title: "Put the link in the first comment",
        body: "Add a second part to your post and Postbase publishes it as the first comment, the usual place for links on LinkedIn.",
      },
    },
    steps: [
      CONNECT_OAUTH("LinkedIn"),
      WRITE_STEP("LinkedIn", "Add a second part if you want a first comment."),
      SCHEDULE_STEP,
    ],
    faqs: [
      [
        "Can I schedule LinkedIn posts with images?",
        "Yes. Attach up to 20 images in the composer or pick them from your media library. Postbase uploads them to LinkedIn when the post goes out.",
      ],
      [
        "Can I schedule a first comment on LinkedIn?",
        "Yes. Add a second part to the post in the composer. Postbase publishes the post, then adds that text as the first comment.",
      ],
      [
        "Can I schedule video or company page posts?",
        "Not yet. Postbase posts text and images to your personal LinkedIn profile today. Video and company pages are on the roadmap.",
      ],
      [
        "Can AI write and schedule my LinkedIn posts?",
        "Yes. Use the Postbase agent inside the app, or connect Claude, Cursor or another MCP client and ask it to schedule a LinkedIn post. You can review everything on the calendar before it goes out.",
      ],
      FREE_TRIAL_FAQ,
    ],
  },
  {
    slug: "bluesky",
    id: "bluesky",
    name: "Bluesky",
    live: true,
    noun: "Bluesky posts",
    limit: 300,
    metaTitle: "Bluesky scheduler: schedule Bluesky posts and threads",
    metaDescription:
      "Schedule Bluesky posts and threads with images. Cross-post to X, LinkedIn and Mastodon from one draft, plan everything on one calendar, or let Claude schedule posts for you over MCP.",
    eyebrow: "Bluesky scheduler",
    h1: ["Schedule posts to", "Bluesky"],
    sub: "Bluesky has no built-in scheduling. Postbase adds it: write a post or a thread, pick a time, and it goes out while you're doing something else.",
    blurb: "Posts and threads up to 300 characters, with up to 4 images.",
    facts: [
      { label: "Characters", value: "300 per post, counted live as you type" },
      { label: "Threads", value: "Chain posts into a thread, published in order" },
      { label: "Images", value: "Up to 4 per post, resized to fit Bluesky's limits" },
      { label: "Sign-in", value: "Connect with a Bluesky app password" },
    ],
    demo: {
      text: "Kochere, Ethiopia just landed ☕️ Washed, light roast, tastes like apricot and black tea. 40 bags this week.",
    },
    tiles: {
      calendar: "Plan Bluesky alongside X and Mastodon on one calendar, instead of posting live every time.",
      agent: "Ask the built-in agent for a Bluesky post and it keeps it under 300 characters for you.",
      agentPrompt: "Announce our new Kochere roast on Bluesky and Mastodon for Wednesday at noon.",
      special: {
        label: "Cross-posting",
        title: "One draft for X, Bluesky and Mastodon",
        body: "Pick all three, write once, and adjust the wording per network only where it matters. Each network's limit is checked as you type.",
      },
    },
    steps: [
      {
        title: "Connect Bluesky",
        body: "Create an app password in Bluesky (Settings → Privacy and security → App passwords), then add it with your handle on the Channels page. You can revoke it from Bluesky any time.",
      },
      WRITE_STEP("Bluesky", "Click Add post to turn it into a thread."),
      SCHEDULE_STEP,
    ],
    faqs: [
      [
        "Can you schedule posts on Bluesky?",
        "Bluesky's app doesn't have scheduling, but you can schedule posts through a tool like Postbase that posts through Bluesky's official API at the time you choose.",
      ],
      [
        "Why does Postbase need an app password?",
        "App passwords are Bluesky's way of letting a tool post for you without your main password. They can only be used for posting and reading, and you can revoke one any time.",
      ],
      [
        "Can I schedule Bluesky threads?",
        "Yes. Add posts to a thread in the composer. Postbase publishes each one as a reply to the one before, in order.",
      ],
      [
        "Can I cross-post to Bluesky and X at the same time?",
        "Yes. Pick both channels and write once. Bluesky allows 300 characters and X 280, and the composer checks both as you type.",
      ],
      FREE_TRIAL_FAQ,
    ],
  },
  {
    slug: "mastodon",
    id: "mastodon",
    name: "Mastodon",
    live: true,
    noun: "Mastodon posts",
    limit: 500,
    metaTitle: "Mastodon scheduler: schedule toots on any instance",
    metaDescription:
      "Schedule Mastodon posts and threads on any instance. Cross-post to X, Bluesky and LinkedIn from one draft and plan the week on one calendar, or let Claude schedule posts over MCP.",
    eyebrow: "Mastodon scheduler",
    h1: ["Schedule posts on", "any instance"],
    sub: "Connect any Mastodon server with an access token, then schedule posts and threads alongside X, Bluesky and LinkedIn.",
    blurb: "Posts and threads on any instance, up to 500 characters.",
    facts: [
      { label: "Characters", value: "500 per post (the default most instances use)" },
      { label: "Threads", value: "Chain posts into a thread, published in order" },
      { label: "Instances", value: "Any server: mastodon.social, fosstodon.org or your own" },
      { label: "Sign-in", value: "An access token from your instance's settings" },
    ],
    demo: {
      text:
        "Kochere, Ethiopia is on the shelf ☕️ Washed, light roast: apricot, black tea and a little bergamot. Roasted Monday, 40 bags this week.",
    },
    tiles: {
      calendar: "See Mastodon next to the rest of your networks, so the fediverse doesn't get forgotten.",
      agent: "Ask the built-in agent for a post and it writes a Mastodon version that fits your instance's limit.",
      agentPrompt: "Share our new Kochere roast on Mastodon and Bluesky for Wednesday at noon.",
      special: {
        label: "Any instance",
        title: "Bring your own server",
        body: "Postbase stores your instance URL with the token, so it works with the big servers and your self-hosted one alike.",
      },
    },
    steps: [
      {
        title: "Connect Mastodon",
        body: "On your instance, open Preferences → Development, create an application with read and write access and copy its access token. Paste it with your instance URL on the Channels page.",
      },
      WRITE_STEP("Mastodon", "Click Add post to turn it into a thread."),
      SCHEDULE_STEP,
    ],
    faqs: [
      [
        "Does Postbase work with my Mastodon instance?",
        "Yes. Postbase works with any Mastodon server. You connect with your instance URL and an access token from that instance.",
      ],
      [
        "Can I schedule Mastodon threads?",
        "Yes. Add posts to a thread in the composer and Postbase publishes each one as a reply to the one before.",
      ],
      [
        "My instance allows more than 500 characters. Does Postbase support that?",
        "The composer checks against 500, the Mastodon default. If your instance allows longer posts, split longer text into a thread for now.",
      ],
      FREE_TRIAL_FAQ,
    ],
  },
  {
    slug: "tiktok",
    id: "tiktok",
    name: "TikTok",
    live: true,
    noun: "TikTok videos",
    limit: 2200,
    metaTitle: "TikTok scheduler: schedule TikTok videos from desktop",
    metaDescription:
      "Schedule TikTok videos and photo posts from your desktop, with captions, privacy and interaction settings. Plan TikTok next to YouTube, X and LinkedIn on one calendar.",
    eyebrow: "TikTok scheduler",
    h1: ["Schedule TikTok videos", "from desktop"],
    sub: "Upload your video once, write the caption, set who can see it, and schedule it next to the rest of your week.",
    blurb: "Videos and photo posts with captions and privacy settings.",
    facts: [
      { label: "Formats", value: "Video, or a photo post with up to 35 images" },
      { label: "Caption", value: "Up to 2,200 characters" },
      { label: "Settings", value: "Privacy, comments, duet and stitch, per post" },
      { label: "Disclosure", value: "Your brand / branded content labels built in" },
    ],
    demo: {
      text: "Pour-over, the slow way ☕️ Kochere from Ethiopia: apricot, black tea, bergamot. 40 bags this week.",
      media: "video",
    },
    tiles: {
      calendar: "Your TikToks sit on the same calendar as your YouTube uploads and posts, so you can see the whole week at once.",
      agent: "Upload the video, then ask the built-in agent to write the caption and pick a time.",
      agentPrompt: "Write a TikTok caption for the pour-over video and schedule it for Friday at 6pm.",
      special: {
        label: "TikTok settings",
        title: "Every setting TikTok asks for",
        body: "Choose who can view the post, whether people can comment, duet or stitch, and label branded content, before it's scheduled.",
      },
    },
    steps: [
      CONNECT_OAUTH("TikTok"),
      {
        title: "Upload and caption",
        body: "Add your video (or up to 35 photos) in the composer, write the caption and choose the privacy and interaction settings in the TikTok panel.",
      },
      SCHEDULE_STEP,
    ],
    faqs: [
      [
        "Can I schedule TikTok videos from my computer?",
        "Yes. Upload the video in Postbase on any computer, set the caption and settings, and schedule it. Postbase posts it through TikTok's official Content Posting API.",
      ],
      [
        "Can I schedule TikTok photo posts?",
        "Yes. Add up to 35 images instead of a video and Postbase publishes them as a photo post.",
      ],
      [
        "Can I choose who sees my TikTok?",
        "Yes. The TikTok panel shows the privacy options your account allows, plus comment, duet and stitch settings for each post.",
      ],
      FREE_TRIAL_FAQ,
    ],
  },
  {
    slug: "youtube",
    id: "youtube",
    name: "YouTube",
    live: true,
    noun: "YouTube videos",
    limit: 5000,
    metaTitle: "YouTube scheduler: schedule YouTube videos and Shorts",
    metaDescription:
      "Upload and schedule YouTube videos and Shorts with a title and description. Plan YouTube next to TikTok, X and LinkedIn on one calendar with Postbase.",
    eyebrow: "YouTube scheduler",
    h1: ["Schedule YouTube videos and", "Shorts"],
    sub: "Upload the video once, write the title and description, and schedule it on the same calendar as your TikToks and posts.",
    blurb: "Videos and Shorts with a title and description.",
    facts: [
      { label: "Format", value: "Video uploads, including Shorts" },
      { label: "Title", value: "The first 100 characters of your post" },
      { label: "Description", value: "Up to 5,000 characters" },
      { label: "Upload", value: "Through YouTube's official Data API" },
    ],
    demo: {
      text: "How we brew the Kochere at home\n\nV60, 15g coffee, 250g water at 94°C, 2:45 total. Swirl, don't stir.",
      media: "video",
    },
    tiles: {
      calendar: "Plan uploads next to your TikToks and posts, and see the week's video schedule at a glance.",
      agent: "Upload the video, then ask the built-in agent to write the title and description and pick a time.",
      agentPrompt: "Write a YouTube title and description for the brew-guide video and schedule it for Saturday at 10am.",
      special: {
        label: "One upload",
        title: "The same video to YouTube and TikTok",
        body: "Pick both channels, add the video once and write a caption for each. Postbase uploads it to both at the time you choose.",
      },
    },
    steps: [
      CONNECT_OAUTH("YouTube"),
      {
        title: "Upload and describe",
        body: "Add your video in the composer and write the post. The start of it becomes the video title and the full text becomes the description.",
      },
      SCHEDULE_STEP,
    ],
    faqs: [
      [
        "Can I schedule YouTube Shorts?",
        "Yes. Upload a vertical video under YouTube's Shorts length limit and schedule it like any other video.",
      ],
      [
        "How does Postbase set the video title?",
        "The first 100 characters of your post become the title, and the full text becomes the description. Keep the opening line short and it works as a title on its own.",
      ],
      [
        "Can I post the same video to YouTube and TikTok?",
        "Yes. Pick both channels, add the video once and write a caption for each network.",
      ],
      FREE_TRIAL_FAQ,
    ],
  },
  // Pending Meta app review: listed as coming soon, no page yet.
  { slug: "instagram", id: "instagram", name: "Instagram", live: false, limit: 2200, blurb: "Posts, carousels and Reels.", ...pending() },
  { slug: "facebook", id: "facebook", name: "Facebook", live: false, limit: 63206, blurb: "Page posts with photos.", ...pending() },
  { slug: "threads", id: "threads", name: "Threads", live: false, limit: 500, blurb: "Posts and threads.", ...pending() },
];

function pending() {
  return {
    metaTitle: "",
    metaDescription: "",
    eyebrow: "",
    h1: ["", ""] as [string, string],
    sub: "",
    facts: [],
    demo: { text: "" },
    tiles: { calendar: "", agent: "", agentPrompt: "", special: { label: "", title: "", body: "" } },
    steps: [],
    faqs: [],
  };
}

export const LIVE_NETWORKS = NETWORKS.filter((n) => n.live);
export const networkBySlug = (slug: string) => LIVE_NETWORKS.find((n) => n.slug === slug);
