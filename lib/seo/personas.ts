import type { Feature } from "@/components/marketing/seo/FeatureTiles";

/*
 * "Postbase for X" audience pages. Drives /for/[slug] and the sitemap. Only
 * describe what the app does today (no approval workflow, text-only MCP).
 */

export type Persona = {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: [string, string];
  sub: string;
  /** One short line for the persona's card in "Related". */
  blurb: string;
  /** Hero product shot. */
  hero: { kind: "composer"; network: string } | { kind: "client"; client: string } | { kind: "calendar" };
  frame: string;
  problems: { title: string; body: string }[];
  features: Feature[];
  /** Plan id from lib/plans to recommend. */
  plan: "creator" | "team" | "growth" | "agency";
  planWhy: string;
  faqs: [string, string][];
  related: string[];
};

export const PERSONAS: Persona[] = [
  {
    slug: "creators",
    name: "Creators",
    metaTitle: "Social media scheduler for creators",
    metaDescription: "Write once and post to X, LinkedIn, Bluesky, Mastodon, TikTok and YouTube, with a version for each network and the month on one calendar.",
    eyebrow: "Postbase for creators",
    h1: ["Post everywhere,", "write once"],
    sub: "Write one post, fit it to every network you're on, and plan the whole month on one calendar, so you spend your time making things instead of copying and pasting.",
    blurb: "Write once, fit it to every network and plan the month on one calendar.",
    hero: { kind: "composer", network: "x" },
    frame: "One draft, a version for every network",
    problems: [
      {
        title: "Posting the same thing five times",
        body: "Copy, paste, trim for X, add line breaks for LinkedIn, log in to Bluesky. Every post, every day.",
      },
      {
        title: "Consistency falls apart in busy weeks",
        body: "When you're deep in a project, posting is the first thing to go, and the algorithm notices.",
      },
      {
        title: "No idea what's actually working",
        body: "Numbers are spread across every app, so you never see which network is worth the effort.",
      },
    ],
    features: [
      {
        shot: "month",
        label: "Planning",
        title: "See the whole month at a glance",
        body: "Batch a week of posts in one sitting and see exactly what goes out when, across every network.",
      },
      {
        shot: "agent",
        label: "AI agent",
        title: "Tell it what to post",
        body: "Describe a post in one sentence. The agent writes a version for each network and lines it up for the time you asked.",
      },
      {
        shot: "media",
        label: "Media",
        title: "Your clips, ready to reuse",
        body: "Upload images and video up to 1 GB once, then pick them for any post from the library.",
      },
      {
        shot: "queue",
        label: "Publishing",
        title: "Know exactly what went out",
        body: "See every post's delivery on every network. Failures retry on their own, and anything that needs you is flagged.",
      },
      {
        shot: "analytics",
        label: "Analytics",
        title: "See what's working",
        body: "Likes, comments, shares and more for every published post, and which network is pulling its weight.",
      },
    ],
    plan: "creator",
    planWhy: "Five channels covers the usual creator set: X, LinkedIn, Bluesky, TikTok and YouTube.",
    faqs: [
      [
        "Can I post a different version to each network?",
        "Yes. Write the post once, then open each network's tab to change the wording. Each version is checked against that network's character limit as you type.",
      ],
      [
        "Can I schedule TikTok and YouTube videos?",
        "Yes. Upload the video once in the composer, write a caption for each and schedule them together. TikTok's privacy and interaction settings are in the composer too.",
      ],
      [
        "Can I repeat evergreen posts?",
        "Yes. Set a post to repeat and Postbase publishes it again on the schedule you choose.",
      ],
      [
        "Is there a free trial?",
        "Every plan starts with 7 days free. You can also self-host the open-source version for free.",
      ],
    ],
    related: ["/integrations/tiktok", "/integrations/youtube", "/tools/character-counter"],
  },
  {
    slug: "founders",
    name: "Founders",
    metaTitle: "Social media for founders: let Claude post",
    metaDescription: "Turn launches and updates into posts for X, LinkedIn and Bluesky from Claude, Cursor or Claude Code, all on a calendar you can check.",
    eyebrow: "Postbase for founders",
    h1: ["Build in public", "without the busywork"],
    sub: "Connect Postbase to Claude, Claude Code or Cursor, and your launch notes turn into posts for every network, scheduled on a calendar you check once a week.",
    blurb: "Turn launch notes into scheduled posts from Claude, Claude Code or Cursor.",
    hero: { kind: "client", client: "claude" },
    frame: "Connect Claude from the AI & API page",
    problems: [
      {
        title: "You ship, then forget to tell anyone",
        body: "The release goes out on Tuesday. The announcement goes out never, because there's always another bug.",
      },
      {
        title: "Every network wants something different",
        body: "A thread for X, a story for LinkedIn, something short for Bluesky. It's three jobs, not one.",
      },
      {
        title: "Tools built for social media managers",
        body: "Most schedulers assume someone's job is to sit in them all day. Yours isn't.",
      },
    ],
    features: [
      {
        shot: "mcp",
        label: "MCP",
        title: "Post from the AI tool you already use",
        body: "Claude, Claude Code, Cursor, VS Code, Windsurf or Gemini CLI. Sign in once and ask it to schedule posts.",
      },
      {
        shot: "agent",
        label: "AI agent",
        title: "Or use the agent built in",
        body: "One sentence in, a post for each network out, scheduled when you say so.",
      },
      {
        shot: "calendar",
        label: "Calendar",
        title: "Check the week in two minutes",
        body: "Everything you and your agent scheduled, on one calendar. Edit or cancel anything before it goes out.",
      },
      {
        shot: "revoke",
        label: "Access",
        title: "Take access back in one click",
        body: "Every AI tool you've connected is listed on the AI & API page. Revoke one and it's cut off immediately.",
      },
      {
        shot: "tools",
        label: "Tools",
        title: "Small, predictable powers",
        body: "Agents can list channels, create posts and threads, check the queue and cancel. They can't delete anything.",
      },
    ],
    plan: "creator",
    planWhy: "Enough for a personal account and a company account on X, LinkedIn and Bluesky, with the MCP server and API included.",
    faqs: [
      [
        "Can Claude write and schedule my launch posts?",
        "Yes. Add the Postbase connector to Claude and ask it to write the posts and schedule them. They appear on your Postbase calendar, where you can edit or cancel them.",
      ],
      [
        "Can I post as both myself and my company?",
        "Yes, connect both accounts. On LinkedIn, Postbase posts to personal profiles today; company pages are on the roadmap.",
      ],
      [
        "Is there an API?",
        "Yes, on every plan. Create a key on the AI & API page and post from scripts, CI or your own app.",
      ],
      [
        "Is Postbase open source?",
        "Yes. You can read the code, or self-host it for free with your own platform API keys.",
      ],
    ],
    related: ["/ai/claude", "/ai/claude-code", "/blog/announce-releases-with-claude-code"],
  },
  {
    slug: "agencies",
    name: "Agencies",
    metaTitle: "Social media scheduler for agencies",
    metaDescription: "A Postbase workspace per client with its own channels and team, up to 20 clients and 100 channels on one flat $99 monthly bill.",
    eyebrow: "Postbase for agencies",
    h1: ["Every client,", "one login"],
    sub: "Give each client their own workspace with its own channels and team, switch between them in one click, and pay one flat bill for all of them instead of per channel.",
    blurb: "A workspace per client, one-click switching and one bill for up to 20 clients.",
    hero: { kind: "calendar" },
    frame: "Each client's week in its own calendar",
    problems: [
      {
        title: "Per-channel pricing eats the margin",
        body: "Add a client with five accounts and your tool bill jumps. Scheduling shouldn't cost more than the work.",
      },
      {
        title: "Clients bleeding into each other",
        body: "One wrong dropdown and a post meant for one brand goes out on another.",
      },
      {
        title: "Nobody knows what went out",
        body: "When a client asks whether Tuesday's post published, you shouldn't have to check five apps.",
      },
    ],
    features: [
      {
        shot: "month",
        label: "Planning",
        title: "Plan each client's month",
        body: "Month, week and day views per workspace, so each client's plan is separate and easy to share on a call.",
      },
      {
        shot: "media",
        label: "Media",
        title: "A media library per client",
        body: "Each workspace keeps its own images and video, up to 1 GB per file.",
      },
      {
        shot: "queue",
        label: "Publishing",
        title: "Proof of what went out",
        body: "The queue shows every post's delivery on every channel, with automatic retries and flags for anything that needs you.",
      },
      {
        shot: "agent",
        label: "AI agent",
        title: "Drafts in seconds",
        body: "Ask the agent for a week of posts in a client's voice, then review them before anything is scheduled.",
      },
      {
        shot: "analytics",
        label: "Analytics",
        title: "Numbers for the monthly report",
        body: "Engagement for every published post, by network, for each client.",
      },
    ],
    plan: "agency",
    planWhy: "20 client workspaces, 100 channels and 30 people for $99/month. Smaller? Pro covers 5 workspaces for $59/month.",
    faqs: [
      [
        "Can I keep clients separate?",
        "Yes. Each client gets a workspace with its own channels, media, calendar and team, and you switch between them from the sidebar. Create one from the workspace menu.",
      ],
      [
        "Can I add my team?",
        "Yes. Invite people as members or admins. Admins can manage the team; members can write and schedule posts.",
      ],
      [
        "Is there a client approval workflow?",
        "Not yet. For now, save posts as drafts for review and schedule them once they're approved.",
      ],
      [
        "How is pricing different from per-channel tools?",
        "One flat monthly bill covers every workspace on the plan: Agency is $99/month for 20 workspaces and 100 channels, Pro is $59/month for 5 and 50. Channels and seats are shared across the workspaces, so you split them however your clients need. Per-channel tools charge for every account you add.",
      ],
    ],
    related: ["/alternatives/hootsuite", "/alternatives/buffer", "/integrations/linkedin"],
  },
  {
    slug: "small-businesses",
    name: "Small businesses",
    metaTitle: "Social media scheduling for small businesses",
    metaDescription: "Plan a month of posts in an afternoon. Schedule to X, LinkedIn, Bluesky, TikTok and YouTube, with AI drafts and on-time publishing.",
    eyebrow: "Postbase for small businesses",
    h1: ["A month of posts", "in an afternoon"],
    sub: "Write your posts in one sitting, let Postbase fit them to each network, and get back to running the business. Everything goes out on time without you.",
    blurb: "Write your posts in one sitting and they go out on time without you.",
    hero: { kind: "composer", network: "linkedin" },
    frame: "One post, fitted to each network",
    problems: [
      {
        title: "Posting when you remember",
        body: "Social media happens in the gaps between everything else, so weeks go by with nothing.",
      },
      {
        title: "Not sure what to write",
        body: "You know your product. Turning it into a post every other day is a different skill.",
      },
      {
        title: "Too many logins",
        body: "A different app for every network, each with its own quirks and limits.",
      },
    ],
    features: [
      {
        shot: "month",
        label: "Planning",
        title: "Plan the month in one sitting",
        body: "See the whole month, click an open slot and write a post for that time.",
      },
      {
        shot: "agent",
        label: "AI agent",
        title: "Help with the writing",
        body: "Tell the agent what's new and it drafts a post for each network. You approve it before it's scheduled.",
      },
      {
        shot: "composer",
        label: "Writing",
        title: "One post, fitted to every network",
        body: "Write once, then adjust the wording for each network. Every version keeps to that network's character limit.",
      },
      {
        shot: "queue",
        label: "Publishing",
        title: "It goes out without you",
        body: "Posts publish on time, retry on their own if a network has a hiccup, and flag anything that needs you.",
      },
      {
        shot: "media",
        label: "Media",
        title: "Your photos, ready to use",
        body: "Upload product photos and videos once and reuse them across posts.",
      },
    ],
    plan: "creator",
    planWhy: "Five channels, unlimited posts, the AI agent and analytics, for $29/month.",
    faqs: [
      [
        "Do I need to be good at social media?",
        "No. Tell the AI agent what's new and it drafts the posts. You read them, change anything you like, and schedule them.",
      ],
      [
        "Can my team help?",
        "Yes, on the Team plan. Invite people to your workspace and they can write and schedule posts too.",
      ],
      [
        "Does Postbase support Instagram and Facebook?",
        "They're coming soon, once Meta approves our app. X, LinkedIn, Bluesky, Mastodon, TikTok and YouTube work today.",
      ],
      [
        "Is there a free trial?",
        "Yes. Every plan starts with 7 days free, and you can cancel any time before it ends.",
      ],
    ],
    related: ["/integrations/linkedin", "/integrations/x", "/tools/character-counter"],
  },
];

export const personaBySlug = (slug: string) => PERSONAS.find((p) => p.slug === slug);
