/*
 * "Alternative to X" pages. Drives /alternatives, /alternatives/[slug] and the
 * sitemap. Competitor facts come from their official pricing pages and docs,
 * checked on CHECKED; re-check before editing and keep the sources list current.
 * Be fair: every page says when the other tool is the better pick.
 */

import { tiktokCaveat } from "@/lib/platforms/availability";

export const CHECKED = "26 September 2026";

/** Postbase's side of every comparison table, keyed by row. */
export const US = {
  price: "$29/month for 5 channels, billed monthly or yearly",
  free: "No free hosted plan: a 7-day trial, or self-host for free",
  scaling: "Per plan, not per channel: 15 channels and team seats for $39/month",
  networks: `X, LinkedIn, Bluesky, Mastodon, TikTok${tiktokCaveat(" (private posts for now)")}, YouTube (Instagram, Facebook and Threads coming soon)`,
  mcp: "Yes, on every plan. Sign in with Postbase or use an API key",
  api: "Yes, on every plan. Create a key on the AI & API page",
  oss: "Yes. Self-host for free with your own platform keys",
};

export type Row = { label: string; key: keyof typeof US; them: string };

export type Competitor = {
  slug: string;
  name: string;
  /** One short line for link cards. */
  blurb: string;
  metaTitle: string;
  metaDescription: string;
  h1: [string, string];
  sub: string;
  /** One fair sentence on who the other tool is for. */
  them: string;
  chooseUs: string[];
  chooseThem: string[];
  rows: Row[];
  switchSteps: { title: string; body: string }[];
  faqs: [string, string][];
  sources: { label: string; url: string }[];
  /** When this competitor's facts were checked, if not CHECKED. */
  checked?: string;
};

const SWITCH = (name: string) => [
  {
    title: "Start a trial",
    body: "Sign up for Postbase. Every plan starts with 7 days free, so you can run both tools side by side for a week.",
  },
  {
    title: "Connect your channels",
    body: `Connect the same accounts you use in ${name} from the Channels page. Connecting to Postbase doesn't disconnect them from ${name}.`,
  },
  {
    title: "Move your queue",
    body: `Recreate the posts still queued in ${name}, or ask Claude or another MCP client to do it for you. Then cancel them in ${name} so nothing posts twice.`,
  },
];

export const COMPETITORS: Competitor[] = [
  {
    slug: "buffer",
    name: "Buffer",
    blurb: "A simple scheduler with a free plan, priced per channel.",
    metaTitle: "Buffer alternative: open source, flat pricing",
    metaDescription:
      "Comparing Postbase and Buffer: pricing per plan vs per channel, networks, MCP and API, and open source. An honest look at when each one is the better pick.",
    h1: ["The open-source", "Buffer alternative"],
    sub: "Buffer charges per channel. Postbase charges per plan, is open source, and has an agent that writes and schedules posts for you.",
    them: "Buffer is a simple, well-loved scheduler for creators and small businesses, with a free plan and per-channel pricing.",
    chooseUs: [
      "You post to more than a handful of channels and want a flat price. 15 channels is $39/month on Postbase.",
      "You want to self-host, or read the code that posts for you.",
      "You want an AI agent inside the app that drafts and schedules, as well as an MCP server for Claude and Cursor.",
    ],
    chooseThem: [
      "You need Instagram, Facebook, Threads or Pinterest today. Postbase is waiting on Meta's app review.",
      "You only post to two or three channels and want a free plan.",
      "You want built-in engagement tools for replying to comments.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$5 per channel per month (Essentials)" },
      { label: "Free plan", key: "free", them: "Yes: 3 channels and 10 queued posts per channel" },
      { label: "How pricing scales", key: "scaling", them: "Per channel: 15 channels on Essentials is $75/month" },
      {
        label: "Networks",
        key: "networks",
        them: "X, LinkedIn, Bluesky, Mastodon, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest, Google Business Profile, Substack",
      },
      { label: "MCP server", key: "mcp", them: "Yes, an official remote server for Claude" },
      { label: "Public API", key: "api", them: "Yes, on every plan, with request quotas by plan" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("Buffer"),
    faqs: [
      [
        "Is Postbase cheaper than Buffer?",
        "It depends on how many channels you have. Buffer's Essentials plan is $5 per channel per month, so up to five channels Buffer costs less. From six channels up, Postbase's flat plans cost less: 15 channels is $39/month on Postbase and $75/month on Buffer Essentials.",
      ],
      [
        "Does Postbase have a free plan like Buffer?",
        "Not a hosted one. Postbase has a 7-day free trial on every plan. It's also open source, so you can self-host it for free with your own platform API keys.",
      ],
      [
        "Can I use Claude with both?",
        "Yes, both have an MCP server. Postbase also has its own agent inside the app, and posts your agent schedules appear on your Postbase calendar.",
      ],
      [
        "Can I import my Buffer queue?",
        "There's no one-click import yet. Recreate your queued posts in the composer, or connect Claude over MCP and ask it to recreate them from a list.",
      ],
    ],
    sources: [
      { label: "Buffer pricing", url: "https://buffer.com/pricing" },
      { label: "Buffer: scheduling limits", url: "https://support.buffer.com/article/643-how-many-posts-can-i-schedule-in-advance" },
      { label: "Buffer MCP server", url: "https://developers.buffer.com/guides/integrations/claude.html" },
    ],
  },
  {
    slug: "hootsuite",
    name: "Hootsuite",
    blurb: "A full social suite for larger teams, inbox included.",
    metaTitle: "Hootsuite alternative from $29/month",
    metaDescription: "Postbase vs Hootsuite: price, networks, API access, MCP and open source, and when you need Hootsuite versus a lighter scheduler.",
    h1: ["A lighter", "Hootsuite alternative"],
    sub: "If you mostly need to schedule posts, Postbase does that for $29 a month, with an API key you can create yourself and an agent that posts for you.",
    them: "Hootsuite is a full social media suite for larger teams: publishing, a shared inbox, listening and reporting.",
    chooseUs: [
      "You mainly need scheduling and a calendar, not a full suite. Postbase starts at $29/month, billed monthly.",
      "You post to Mastodon, or want to self-host.",
      "You want an API key today, without applying for developer access.",
    ],
    chooseThem: [
      "You need a shared inbox, social listening or competitor benchmarking.",
      "You need Instagram, Facebook, Threads or Pinterest today.",
      "Your company needs enterprise approvals, reporting and support contracts.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$99 per user per month (Standard, billed yearly)" },
      { label: "Free plan", key: "free", them: "No: a 14-day trial" },
      { label: "How pricing scales", key: "scaling", them: "Per user. Standard includes 10 social accounts" },
      {
        label: "Networks",
        key: "networks",
        them: "X, LinkedIn, Bluesky, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest. Mastodon only through a third-party app",
      },
      { label: "MCP server", key: "mcp", them: "Yes, official MCP servers for publishing, inbox and listening" },
      { label: "Public API", key: "api", them: "Yes, after applying for developer access" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("Hootsuite"),
    faqs: [
      [
        "Is Postbase a full Hootsuite replacement?",
        "For scheduling and publishing, yes. Postbase doesn't have a shared inbox or social listening, so if your team relies on those, Hootsuite is the better fit.",
      ],
      [
        "How much cheaper is Postbase than Hootsuite?",
        "Hootsuite's Standard plan is $99 per user per month billed yearly. Postbase's Creator plan is $29/month for 5 channels, and Team is $39/month for 15 channels with team seats.",
      ],
      [
        "Does Postbase support Mastodon?",
        "Yes, on any instance. Connect with your instance URL and an access token.",
      ],
      [
        "Can I use the Postbase API without applying?",
        "Yes. Create a key on the AI & API page and call the REST API straight away, on every plan.",
      ],
    ],
    sources: [
      { label: "Hootsuite plans", url: "https://www.hootsuite.com/plans" },
      { label: "Hootsuite Standard plan", url: "https://www.hootsuite.com/plans/standard" },
      { label: "Hootsuite MCP", url: "https://www.hootsuite.com/integrations/mcp" },
      { label: "Hootsuite REST APIs", url: "https://developer.hootsuite.com/docs/using-rest-apis" },
    ],
  },
  {
    slug: "typefully",
    name: "Typefully",
    blurb: "A polished writing app for X and LinkedIn creators.",
    metaTitle: "Typefully alternative for TikTok, YouTube and threads",
    metaDescription:
      "Comparing Postbase and Typefully: networks (including TikTok and YouTube), billing, MCP and API, and open source. When each one is the better pick.",
    h1: ["A Typefully alternative", "with video"],
    sub: "Typefully is built for writing threads. Postbase schedules threads too, plus TikTok and YouTube videos, all on one calendar.",
    them: "Typefully is a polished writing app for X and LinkedIn creators, with a great thread editor and X growth tools.",
    chooseUs: [
      "You post video to TikTok or YouTube as well as text.",
      "You want monthly billing, or to self-host an open-source tool.",
      "You want one calendar for every network, text and video.",
    ],
    chooseThem: [
      "You mostly write for X and want X growth tools like auto-plugs and detailed X analytics.",
      "You want a free plan for a single account.",
      "You need Threads today.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "Paid plans are billed yearly" },
      { label: "Free plan", key: "free", them: "Yes: 1 account set and 10 posts a month" },
      { label: "Networks", key: "networks", them: "X, LinkedIn, Threads, Bluesky, Mastodon. No TikTok, YouTube or Instagram" },
      { label: "MCP server", key: "mcp", them: "Yes, on every plan including Free" },
      { label: "Public API", key: "api", them: "Yes, on every plan" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("Typefully"),
    faqs: [
      [
        "Can Postbase schedule X threads like Typefully?",
        "Yes. Add up to 25 posts to a thread in the composer and reorder them by dragging. Bluesky and Mastodon threads work the same way.",
      ],
      [
        "Does Postbase have X analytics?",
        "Postbase shows post analytics for your connected channels. Typefully goes deeper on X-specific growth metrics.",
      ],
      [
        "Can I pay monthly?",
        "Yes. Every Postbase plan can be paid monthly or yearly (yearly gets you two months free).",
      ],
      [
        "Do both work with Claude?",
        "Yes, both have an MCP server. Postbase also has an agent built into the app that drafts and schedules posts.",
      ],
    ],
    sources: [
      { label: "Typefully pricing", url: "https://typefully.com/pricing" },
      { label: "Typefully social sets", url: "https://support.typefully.com/en/articles/8717684-social-sets-and-accounts" },
      { label: "Typefully MCP server", url: "https://support.typefully.com/en/articles/13128440-typefully-mcp-server" },
    ],
  },
  {
    slug: "ayrshare",
    name: "Ayrshare",
    blurb: "A social media API for apps that post for customers.",
    metaTitle: "Ayrshare alternative: API and MCP from $29/month",
    metaDescription: "Postbase vs Ayrshare for posting from code or AI agents: price, MCP sign-in, networks and open source. When each one is the better pick.",
    h1: ["An Ayrshare alternative for", "your own accounts"],
    sub: "If you're posting to your own or your team's accounts from code or an AI agent, Postbase gives you an API, a hosted MCP server and a calendar from $29 a month.",
    them: "Ayrshare is a social media API for platforms that post on behalf of many customers, with white-label multi-tenant profiles.",
    chooseUs: [
      "You post to your own or your team's accounts, not your customers'.",
      "You want to connect Claude or Cursor by signing in, with no key to paste.",
      "You want a calendar and composer next to the API, or to self-host.",
    ],
    chooseThem: [
      "You're building a product that posts for your users and need white-label, multi-tenant profiles.",
      "You need networks like Instagram, Pinterest, Reddit, Telegram or WhatsApp today.",
      "You need a large API surface: comments, analytics and moderation endpoints.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$149/month (Premium, 1 profile)" },
      { label: "Free plan", key: "free", them: "No: a 28-day trial" },
      {
        label: "Networks",
        key: "networks",
        them: "X, LinkedIn, Bluesky, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest, Reddit, Snapchat, Telegram, WhatsApp, Google Business. No Mastodon",
      },
      { label: "MCP server", key: "mcp", them: "Yes, authenticated with your API key" },
      { label: "Public API", key: "api", them: "Yes, it's the core product" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: [
      {
        title: "Start a trial",
        body: "Sign up for Postbase and connect the accounts you post to. Every plan starts with 7 days free.",
      },
      {
        title: "Create an API key",
        body: "Create a key on the AI & API page. It works for the REST API and the npm MCP server, and you can revoke it any time.",
      },
      {
        title: "Point your code at Postbase",
        body: "Swap your post calls for POST /api/v1/posts with the channel ids from GET /api/v1/channels. Posts you create show up on the calendar.",
      },
    ],
    faqs: [
      [
        "Is Postbase a drop-in replacement for the Ayrshare API?",
        "No. Postbase's API is smaller: list channels, create posts and threads, list and cancel scheduled posts. It's built for posting to your own accounts, not for managing thousands of end-user profiles.",
      ],
      [
        "How do AI agents connect?",
        "Add the hosted MCP server to Claude, Claude Code, Cursor, VS Code, Windsurf or Gemini CLI and sign in with Postbase. Or use the @postbasehq/mcp npm package with an API key.",
      ],
      [
        "Does Postbase support Mastodon?",
        "Yes, on any instance.",
      ],
    ],
    sources: [
      { label: "Ayrshare pricing", url: "https://www.ayrshare.com/pricing/" },
      { label: "Ayrshare supported networks", url: "https://www.ayrshare.com/docs/introduction" },
      { label: "Ayrshare MCP server", url: "https://www.ayrshare.com/docs/additional/mcp-server" },
    ],
  },
  {
    slug: "hypefury",
    name: "Hypefury",
    blurb: "A scheduler for solo creators, with auto-plugs and DMs.",
    checked: "27 September 2026",
    metaTitle: "Hypefury alternative that still posts to X",
    metaDescription: "Hypefury no longer supports X. Postbase schedules X posts and threads plus LinkedIn, Bluesky, TikTok and YouTube, with an MCP server.",
    h1: ["A Hypefury alternative that", "still posts to X"],
    sub: "Hypefury has dropped X. Postbase schedules X posts and threads alongside LinkedIn, Bluesky and Mastodon, from one calendar.",
    them: "Hypefury is a scheduler for solo creators, known for auto-plugs, auto-DMs and AI that writes in your own voice.",
    chooseUs: [
      "You post to X. Hypefury's pricing page says it no longer supports X.",
      "You want YouTube as well as short-form networks, all on one calendar.",
      "You want an API and an MCP server for Claude and Cursor, or to self-host.",
    ],
    chooseThem: [
      "You don't need X and want monetisation automation like auto-plugs and auto-DMs.",
      "You only post to one network and want the $6/month single-channel plan.",
      "You want AI trained on your own past posts.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$6/month for one channel, or $19/month for all channels" },
      { label: "Free plan", key: "free", them: "No: a 7-day trial" },
      { label: "Networks", key: "networks", them: "Bluesky, Threads, LinkedIn, Instagram, TikTok, Mastodon. No X or YouTube" },
      { label: "MCP server", key: "mcp", them: "None found" },
      { label: "Public API", key: "api", them: "None found" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("Hypefury"),
    faqs: [
      [
        "Does Hypefury still support X?",
        "Hypefury's pricing page says it no longer supports X. Postbase does: posts, threads of up to 25 posts, images and video.",
      ],
      [
        "Can Postbase schedule X threads?",
        "Yes. Add posts to a thread in the composer and Postbase publishes them as a chain of replies at the time you pick.",
      ],
      [
        "Does Postbase have auto-plugs or auto-DMs?",
        "No. Postbase focuses on writing, scheduling and publishing. If those automations are central to how you grow, Hypefury is the better fit on the networks it supports.",
      ],
    ],
    sources: [
      { label: "Hypefury pricing", url: "https://hypefury.com/pricing/" },
      { label: "Hypefury", url: "https://hypefury.com/" },
    ],
  },
  {
    slug: "later",
    name: "Later",
    blurb: "A visual planner for Instagram-first and TikTok brands.",
    checked: "27 September 2026",
    metaTitle: "Later alternative for X, Bluesky and AI agents",
    metaDescription: "Comparing Postbase and Later: X, Bluesky and Mastodon vs Instagram and Pinterest, post limits, API and MCP. When each is the better pick.",
    h1: ["A Later alternative for", "text and threads"],
    sub: "Later is built around Instagram and TikTok. Postbase covers X, Bluesky, Mastodon and LinkedIn as well, with unlimited posts and an AI agent.",
    them: "Later is a visual planner for Instagram-, TikTok- and Pinterest-first brands, with an influencer marketing product alongside.",
    chooseUs: [
      "You post to X, Bluesky or Mastodon. Later doesn't support them.",
      "You want unlimited posts rather than a monthly cap per profile.",
      "You want an API or an MCP server so Claude or your own code can post.",
    ],
    chooseThem: [
      "Instagram, Pinterest or Snapchat is your main channel. Postbase is waiting on Meta's app review for Instagram.",
      "You want a visual grid planner for Instagram.",
      "You run influencer campaigns and want them in the same tool.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$25/month (Starter), or $18.75/month billed yearly" },
      { label: "Free plan", key: "free", them: "No: a 14-day trial" },
      { label: "How pricing scales", key: "scaling", them: "By social sets and users. Starter allows 30 posts per profile per month" },
      { label: "Networks", key: "networks", them: "Instagram, Facebook, TikTok, Threads, YouTube, Pinterest, LinkedIn, Snapchat. No X, Bluesky or Mastodon" },
      { label: "MCP server", key: "mcp", them: "None found" },
      { label: "Public API", key: "api", them: "No public posting API" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("Later"),
    faqs: [
      [
        "Does Postbase support Instagram like Later?",
        "Not yet. Instagram, Facebook and Threads are waiting on Meta's app review. If Instagram is your main channel today, Later is the better pick.",
      ],
      [
        "Is there a post limit on Postbase?",
        "No. Every Postbase plan includes unlimited posts. Later's Starter plan allows 30 posts per profile per month.",
      ],
      [
        "Can I use both?",
        "Yes. Some people keep Later for Instagram and use Postbase for X, LinkedIn, Bluesky and Mastodon.",
      ],
    ],
    sources: [
      { label: "Later pricing", url: "https://later.com/pricing/" },
      { label: "Later help centre", url: "https://help.later.com/hc/en-us/articles/360059362253" },
    ],
  },
  {
    slug: "sprout-social",
    name: "Sprout Social",
    blurb: "An enterprise suite for social teams, with reporting.",
    checked: "27 September 2026",
    metaTitle: "Sprout Social alternative: scheduling from $29/month",
    metaDescription: "Postbase vs Sprout Social: per-seat vs flat pricing, networks, API access and MCP for Claude. When each one is the better pick.",
    h1: ["A lighter", "Sprout Social alternative"],
    sub: "Sprout Social is a full suite priced per seat. If you mainly need scheduling, Postbase does it from $29 a month, with an API and MCP server on every plan.",
    them: "Sprout Social is an enterprise-grade suite for social teams: publishing, a unified inbox, listening and reporting.",
    chooseUs: [
      "You mainly need scheduling and a calendar, and don't want to pay per seat.",
      "You want an API on every plan, and an MCP server that works with Claude.",
      "You post to Mastodon, or want to self-host.",
    ],
    chooseThem: [
      "You need a unified inbox, social listening and advanced reporting.",
      "You need Instagram, Facebook, Threads or Pinterest today.",
      "Your team needs enterprise approvals and support.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$99 per seat per month (Essentials), or $79 billed yearly" },
      { label: "Free plan", key: "free", them: "No: a 30-day trial" },
      { label: "How pricing scales", key: "scaling", them: "Per seat. Essentials includes 5 social profiles" },
      { label: "Networks", key: "networks", them: "X, LinkedIn, Bluesky, TikTok, YouTube, Instagram, Threads, Facebook, Pinterest, Google Business Profile" },
      { label: "MCP server", key: "mcp", them: "Yes, documented for ChatGPT only" },
      { label: "Public API", key: "api", them: "Only on the Advanced ($399 per seat) and Enterprise plans" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("Sprout Social"),
    faqs: [
      [
        "Is Postbase a full Sprout Social replacement?",
        "For scheduling and publishing, yes. Postbase doesn't have a unified inbox or social listening, so if your team relies on those, Sprout is the better fit.",
      ],
      [
        "Does Postbase work with Claude?",
        "Yes. Add the Postbase MCP server to Claude, Claude Code, Cursor and other tools. Sprout documents its MCP server for ChatGPT.",
      ],
      [
        "How does the price compare for a team of three?",
        "Sprout Essentials is $99 per seat per month, so three people is $297/month. Postbase's Team plan is $39/month for 15 channels with team seats.",
      ],
    ],
    sources: [
      { label: "Sprout Social pricing", url: "https://sproutsocial.com/pricing/" },
      { label: "Sprout ChatGPT connection", url: "https://support.sproutsocial.com/hc/en-us/articles/41236268336653-ChatGPT-Connection-Overview-and-Setup" },
    ],
  },
  {
    slug: "publer",
    name: "Publer",
    blurb: "A budget scheduler for small businesses and agencies.",
    checked: "27 September 2026",
    metaTitle: "Publer alternative with an API and MCP on every plan",
    metaDescription: "Postbase vs Publer: per-account vs flat pricing, networks, API and MCP access, and open source. When each one is the better pick.",
    h1: ["A Publer alternative with", "an API on every plan"],
    sub: "Publer keeps its API and MCP server for Business customers. Postbase includes both on every plan, is open source, and has an AI agent built in.",
    them: "Publer is a budget-friendly scheduler for small businesses and agencies, with per-account pricing and a long list of networks.",
    chooseUs: [
      "You want the API and MCP server without moving to a business plan.",
      "You want to self-host, or read the code that posts for you.",
      "You want a flat price as you add accounts: 15 channels for $39/month.",
    ],
    chooseThem: [
      "You only need a few accounts and want the lowest price, or a free plan.",
      "You need Instagram, Facebook, Pinterest, Threads, Telegram or WordPress today.",
      "You want to post to LinkedIn company pages or Facebook groups.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "From $5 per account per month (Professional)" },
      { label: "Free plan", key: "free", them: "Yes: 3 accounts (not X), 10 scheduled posts each" },
      { label: "How pricing scales", key: "scaling", them: "Per account and per extra member" },
      {
        label: "Networks",
        key: "networks",
        them: "X, LinkedIn, Bluesky, Mastodon, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest, Google Business, Telegram, WordPress",
      },
      { label: "MCP server", key: "mcp", them: "Business and Enterprise plans only" },
      { label: "Public API", key: "api", them: "Business and Enterprise plans only" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("Publer"),
    faqs: [
      [
        "Is Postbase cheaper than Publer?",
        "For a few accounts, no: Publer starts at $5 per account and has a free plan. Postbase's flat plans work out cheaper as you add accounts, and include the API and MCP server on every plan.",
      ],
      [
        "Can I post to X on Publer's free plan?",
        "Publer's free plan excludes X. Postbase supports X on every plan.",
      ],
      [
        "Can Claude post through Postbase?",
        "Yes. Add the Postbase MCP server to Claude, Claude Code, Cursor, VS Code, Windsurf or Gemini CLI on any plan.",
      ],
    ],
    sources: [
      { label: "Publer plans and pricing", url: "https://publer.com/help/en/article/what-are-publers-plans-and-pricing-15h4yqh/" },
      { label: "Publer supported networks", url: "https://publer.com/help/en/article/what-social-networks-are-supported-npoun1/" },
      { label: "Publer API docs", url: "https://publer.com/docs" },
    ],
  },
  {
    slug: "socialbee",
    name: "SocialBee",
    blurb: "A category-based scheduler with evergreen recycling.",
    checked: "27 September 2026",
    metaTitle: "SocialBee alternative with an API, MCP and Mastodon",
    metaDescription: "Postbase vs SocialBee: same $29 starting price, plus an API, an MCP server for AI agents, Mastodon and open source. When each is better.",
    h1: ["A SocialBee alternative for", "AI agents"],
    sub: "Same starting price, different strengths: Postbase adds an API, an MCP server for Claude and Cursor, Mastodon, and open source.",
    them: "SocialBee is a scheduler for small businesses built around content categories and evergreen recycling, with an AI copilot.",
    chooseUs: [
      "You want Claude, Cursor or your own code to post for you. SocialBee has no public API.",
      "You post to Mastodon.",
      "You want team seats without paying per user: Team is $39/month for 15 channels.",
    ],
    chooseThem: [
      "You rely on category-based evergreen recycling to keep queues full.",
      "You need Instagram, Facebook, Pinterest or Threads today.",
      "You want Canva built into the composer.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$29/month for 5 profiles (Bootstrap)" },
      { label: "Free plan", key: "free", them: "No: a 14-day trial" },
      { label: "How pricing scales", key: "scaling", them: "Tiers by profile count; extra users $10/month each" },
      { label: "Networks", key: "networks", them: "X, LinkedIn, Bluesky, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest, Google Business. No Mastodon" },
      { label: "MCP server", key: "mcp", them: "None found" },
      { label: "Public API", key: "api", them: "Not yet: on SocialBee's long-term roadmap" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("SocialBee"),
    faqs: [
      [
        "Does Postbase recycle evergreen posts?",
        "Postbase can repeat a post on a schedule you choose. It doesn't have SocialBee's category-based queues.",
      ],
      [
        "Can I automate posting from other tools?",
        "Yes. Postbase has a REST API and an MCP server on every plan, so Zapier-style workflows, scripts and AI agents can create posts.",
      ],
      [
        "Is the price the same?",
        "Both start at $29/month for 5 channels. Postbase's Team plan adds team seats and 15 channels for $39/month.",
      ],
    ],
    sources: [
      { label: "SocialBee pricing", url: "https://socialbee.com/pricing/" },
      { label: "SocialBee help centre", url: "https://help.socialbee.com/hc/en-us/articles/29979123668375" },
    ],
  },
  {
    slug: "post-bridge",
    name: "Post Bridge",
    blurb: "A high-volume scheduler for short-form video accounts.",
    checked: "27 September 2026",
    metaTitle: "Post Bridge alternative: open source, with Mastodon",
    metaDescription: "Postbase vs Post Bridge: price, networks (including Mastodon), MCP and API, open source and the built-in agent. When each is better.",
    h1: ["An open-source", "Post Bridge alternative"],
    sub: "Both schedule to the big networks with an API and MCP server included. Postbase is open source, supports Mastodon, and has an AI agent built in.",
    them: "Post Bridge is a simple, high-volume scheduler for creators and short-form video accounts, with an API and MCP server on its current plans.",
    chooseUs: [
      "You want to self-host, or read the code that posts for you.",
      "You post to Mastodon.",
      "You want an AI agent inside the app, as well as the MCP server.",
    ],
    chooseThem: [
      "You need Instagram, Facebook, Threads or Pinterest today.",
      "You post short-form video at volume to many accounts and want bulk video scheduling.",
      "You want one-click connectors from the Claude and ChatGPT directories.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$39/month for 15 accounts (Marketer)" },
      { label: "Free plan", key: "free", them: "No: a 7-day trial" },
      { label: "How pricing scales", key: "scaling", them: "Tiers by account count, then $1 per extra account on Operator" },
      { label: "Networks", key: "networks", them: "X, LinkedIn, Bluesky, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest, Google Business. No Mastodon" },
      { label: "MCP server", key: "mcp", them: "Yes, with sign-in, listed for Claude and ChatGPT" },
      { label: "Public API", key: "api", them: "Yes, on current plans" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("Post Bridge"),
    faqs: [
      [
        "How do the prices compare?",
        "Post Bridge's Marketer plan is $39/month for 15 accounts. Postbase's Team plan is also $39/month for 15 channels, with team seats, and Creator is $29/month for 5.",
      ],
      [
        "Do both work with Claude?",
        "Yes, both have an MCP server that signs in with OAuth. Postbase also has an agent built into the app.",
      ],
      [
        "Can I self-host Postbase?",
        "Yes. Postbase is open source; run it on your own servers with your own platform API keys.",
      ],
    ],
    sources: [
      { label: "Post Bridge pricing", url: "https://www.post-bridge.com/pricing" },
      { label: "Post Bridge for agents", url: "https://www.post-bridge.com/agents" },
      { label: "Post Bridge API", url: "https://support.post-bridge.com/api/post-bridge-api-overview-access-and-pricing" },
    ],
  },
  {
    slug: "postiz",
    name: "Postiz",
    blurb: "The established open-source scheduler, with 30+ networks.",
    checked: "6 October 2026",
    metaTitle: "Postiz alternative: open source, simpler",
    metaDescription:
      "Postbase vs Postiz: two open-source AGPL schedulers compared on price per channel, networks, MCP, API and AI. An honest look at when Postiz is better.",
    h1: ["A simpler", "Postiz alternative"],
    sub: "Both are open source under AGPL, with an API, a hosted MCP server and an AI agent. Postbase is a smaller app with more channels on its middle plans.",
    them: "Postiz is the most established open-source social scheduler, with 30+ networks, AI image and video generation, and a large self-hosting community.",
    chooseUs: [
      "You want more channels for the money: 15 for $39/month and 50 for $59/month. Postiz Team is 10 channels for $39, and Pro is 30 for $49.",
      "You want a smaller app focused on writing, scheduling and publishing, with fewer settings to learn.",
      "You run several brands and want separate workspaces on one plan: Agency is $99/month for 100 channels across 20 workspaces.",
    ],
    chooseThem: [
      "You need Instagram, Facebook, Threads, Pinterest, Reddit, Discord or any of Postiz's 30+ networks today.",
      "You want AI image and video generation and video clipping included in your plan.",
      "You want the more mature project, with a large community of self-hosters and contributors.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$29/month for 5 channels (Standard), or $23/month billed yearly" },
      { label: "Free plan", key: "free", them: "No: a 7-day trial, or self-host for free" },
      { label: "How pricing scales", key: "scaling", them: "Per plan: 10 channels for $39, 30 for $49, 100 for $99 a month" },
      {
        label: "Networks",
        key: "networks",
        them: "30+, including X, LinkedIn, Bluesky, Mastodon, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest, Reddit, Discord, Slack, Telegram",
      },
      { label: "MCP server", key: "mcp", them: "Yes, on every plan. Hosted, with OAuth sign-in or an API key" },
      { label: "Public API", key: "api", them: "Yes, on every plan, with webhooks" },
      { label: "Open source", key: "oss", them: "Yes, AGPL-3.0. Self-host for free" },
    ],
    switchSteps: SWITCH("Postiz"),
    faqs: [
      [
        "How is Postbase different from Postiz?",
        "They're close: both are open source under AGPL-3.0, and both include an API, a hosted MCP server and an in-app AI agent. Postiz supports far more networks, and its MCP server can attach images and video. Postbase is a smaller app; its MCP tools post text to X, LinkedIn, Bluesky and Mastodon.",
      ],
      [
        "Which is cheaper?",
        "Both start at $29/month for 5 channels. At $39 Postbase gives you 15 channels to Postiz's 10. Postiz Pro is $49 for 30 channels; Postbase Pro is $59 for 50. Postiz's AI image and video allowances are included in its price.",
      ],
      [
        "Can I self-host either?",
        "Yes. Both are AGPL-3.0, so you can run either on your own servers with your own platform API keys.",
      ],
      [
        "Does Postbase support Instagram like Postiz?",
        "Not yet. Instagram, Facebook and Threads are waiting on Meta's app review. If you need them today, Postiz is the better pick.",
      ],
    ],
    sources: [
      { label: "Postiz pricing", url: "https://postiz.com/pricing" },
      { label: "Postiz MCP server", url: "https://postiz.com/mcp" },
      { label: "Postiz MCP docs", url: "https://docs.postiz.com/mcp/introduction" },
      { label: "Postiz AI generation", url: "https://docs.postiz.com/general/composer/ai-and-imports" },
      { label: "Postiz on GitHub", url: "https://github.com/gitroomhq/postiz-app" },
    ],
  },
  {
    slug: "zernio",
    name: "Zernio",
    blurb: "A unified social media API for developers, priced per account.",
    checked: "6 October 2026",
    metaTitle: "Zernio alternative with a calendar and agent",
    metaDescription:
      "Postbase vs Zernio (formerly Late): per-account API pricing vs flat plans, networks, MCP sign-in and open source. When each one is the better pick.",
    h1: ["A Zernio alternative with", "a calendar built in"],
    sub: "Zernio is an API to build on. Postbase is a scheduler with a calendar, a composer and an AI agent, plus an API and MCP server for your own accounts.",
    them: "Zernio, formerly Late, is a developer-first unified API for posting, inboxes, analytics and ads across 15+ networks, priced per connected account.",
    chooseUs: [
      "You want an app to plan and write in, with a calendar and composer, not just an API.",
      "You post to Mastodon, or want to self-host.",
      "You manage a dozen or more channels and want a flat price: 15 channels is $39/month on Postbase and $63/month on Zernio.",
    ],
    chooseThem: [
      "You're building a product that posts for your users and need a large API with SDKs in many languages.",
      "You need Instagram, Facebook, Threads, Reddit, WhatsApp or Telegram today.",
      "You need DMs, comments, analytics or ads through one API, or want your first two accounts free.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "Free for 2 accounts, then $6 per account per month" },
      { label: "Free plan", key: "free", them: "Yes: 2 accounts with unlimited posts and full API access" },
      { label: "How pricing scales", key: "scaling", them: "Per account: $6 each up to 10, $3 each up to 100, then $1. 10 accounts is $48/month" },
      {
        label: "Networks",
        key: "networks",
        them: "X, LinkedIn, Bluesky, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest, Reddit, Telegram, WhatsApp, Google Business. No Mastodon",
      },
      { label: "MCP server", key: "mcp", them: "Yes, hosted, with OAuth sign-in or an API key" },
      { label: "Public API", key: "api", them: "Yes, it's the core product, on every account" },
      { label: "Open source", key: "oss", them: "No. Some client tools are open source; the API is hosted only" },
    ],
    switchSteps: SWITCH("Zernio"),
    faqs: [
      [
        "Is Postbase a drop-in replacement for the Zernio API?",
        "No. Postbase's API is smaller: list channels, create posts and threads, list and cancel scheduled posts. Zernio also covers DMs, comments, analytics and ads.",
      ],
      [
        "Which is cheaper?",
        "For one or two accounts, Zernio: they're free. At 5 accounts Zernio is $18/month against Postbase's $29. From nine accounts up, Postbase's flat plans cost less: 15 channels is $39/month on Postbase and $63/month on Zernio.",
      ],
      [
        "Do both work with Claude?",
        "Yes. Both have a hosted MCP server you can sign in to with OAuth. Postbase's MCP tools post text to X, LinkedIn, Bluesky and Mastodon; Zernio's cover much more of its API.",
      ],
      [
        "Is Late the same as Zernio?",
        "Yes. Late (getlate.dev) renamed itself Zernio in 2026. The API and team stayed the same, and old Late URLs redirect to Zernio.",
      ],
    ],
    sources: [
      { label: "Zernio pricing", url: "https://zernio.com/pricing" },
      { label: "Zernio MCP docs", url: "https://docs.zernio.com/mcp" },
      { label: "Late is now Zernio", url: "https://zernio.com/rebrand" },
    ],
  },
  {
    slug: "upload-post",
    name: "Upload-Post",
    blurb: "An upload API for video creators, with MCP and Claude skills.",
    checked: "6 October 2026",
    metaTitle: "Upload-Post alternative with a calendar",
    metaDescription:
      "Postbase vs Upload-Post: price, free plan, networks, MCP server and Claude Code skills, API and open source. An honest look at when each is better.",
    h1: ["An Upload-Post alternative with", "a calendar and agent"],
    sub: "Upload-Post is an API for pushing video and posts out to 22 networks. Postbase gives you a calendar, a composer and an AI agent, plus an API and MCP server.",
    them: "Upload-Post is an API-first upload service for video creators and developers, with an open-source MCP server, Claude Code skills and a free plan.",
    chooseUs: [
      "You want an app to plan, write and review posts on a calendar, not only an API.",
      "You want to self-host, or read the code that posts for you.",
      "You want an AI agent inside the app that drafts and schedules after you confirm.",
    ],
    chooseThem: [
      "You push video to many networks from code or Claude Code, and want ready-made skills and FFmpeg processing.",
      "You need Instagram, Facebook, Threads, Pinterest, Reddit or another of its 22 networks today.",
      "You want a free plan, or the lowest price for a few profiles: Basic is $24/month.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$24/month for 5 profiles (Basic), or $192 billed yearly" },
      { label: "Free plan", key: "free", them: "Yes: 2 profiles and 10 uploads a month, no TikTok" },
      { label: "How pricing scales", key: "scaling", them: "Tiers by profile: 25 for $50, 75 for $147, 225 for $438 a month" },
      {
        label: "Networks",
        key: "networks",
        them: "22, including X, LinkedIn, Bluesky, Mastodon, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest, Reddit, Discord, Telegram",
      },
      { label: "MCP server", key: "mcp", them: "Yes, hosted, with OAuth or an API key. The server is open source (MIT)" },
      { label: "Public API", key: "api", them: "Yes, it's the core product, with Python and JavaScript SDKs" },
      { label: "Open source", key: "oss", them: "The MCP server and skills are. The upload service isn't" },
    ],
    switchSteps: SWITCH("Upload-Post"),
    faqs: [
      [
        "Can Postbase post video like Upload-Post?",
        "Yes, from the composer: Postbase posts video to TikTok, YouTube and X. Its MCP tools are text-only, so if you want Claude to upload video for you, Upload-Post is the better fit.",
      ],
      [
        "Do both work with Claude Code?",
        "Yes. Both have a hosted MCP server, and Upload-Post also publishes Claude Code skills. Postbase's MCP server creates text posts and threads for X, LinkedIn, Bluesky and Mastodon.",
      ],
      [
        "Which is cheaper?",
        "Upload-Post: Basic is $24/month for 5 profiles (a profile links your connected accounts), and there's a free plan. Postbase starts at $29/month for 5 channels, with the calendar, composer and AI agent included.",
      ],
      [
        "Is Upload-Post open source?",
        "Its MCP server (MIT) and skills are on GitHub; the upload service itself is hosted. Postbase is open source under AGPL-3.0 and can be self-hosted.",
      ],
    ],
    sources: [
      { label: "Upload-Post pricing", url: "https://www.upload-post.com/pricing" },
      { label: "Upload-Post plans and platforms", url: "https://www.upload-post.com/llms-full.txt" },
      { label: "Upload-Post for AI agents", url: "https://www.upload-post.com/ai-agents/" },
      { label: "Upload-Post Claude Code skills", url: "https://www.upload-post.com/skills/claude-code/" },
    ],
  },
  {
    slug: "opentweet",
    name: "OpenTweet",
    blurb: "An X scheduler built for AI agents, with an MCP server.",
    checked: "6 October 2026",
    metaTitle: "OpenTweet alternative for X and beyond",
    metaDescription:
      "Postbase vs OpenTweet: X-first vs multi-network scheduling, price, link-post limits, MCP and API, and open source. When each one is the better pick.",
    h1: ["An OpenTweet alternative", "beyond X"],
    sub: "OpenTweet is built around X. Postbase schedules X posts and threads alongside LinkedIn, Bluesky, Mastodon, TikTok and YouTube, with an MCP server and an agent.",
    them: "OpenTweet is an X-focused scheduler for creators, developers and AI agents, with a large MCP toolset for X and cross-posting to Bluesky and LinkedIn.",
    chooseUs: [
      "You post to Mastodon, TikTok or YouTube as well as X.",
      "You manage more than a few accounts and want a flat plan: 15 channels and team seats for $39/month.",
      "You want to self-host, or read the code that posts for you.",
    ],
    chooseThem: [
      "X is your main network and you want X-specific tools like articles, evergreen recycling and X analytics over MCP.",
      "You post a lot of links on X: Pro allows 10 link posts a day, while Postbase caps X link posts at 20 a month on Creator.",
      "You only post to one X account and want the lowest price.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$15.99/month for 1 X account (Pro), or $11.99/month billed yearly" },
      { label: "Free plan", key: "free", them: "No: a 7-day trial" },
      { label: "How pricing scales", key: "scaling", them: "Tiers by X account: 3 for $39.99, 10 for $79.99 a month" },
      {
        label: "Networks",
        key: "networks",
        them: "X, with cross-posting to Bluesky and LinkedIn personal profiles. No TikTok, YouTube or Mastodon",
      },
      { label: "MCP server", key: "mcp", them: "Yes, hosted or via npm, authenticated with your API key" },
      { label: "Public API", key: "api", them: "Yes, on every plan, with daily request limits by plan" },
      { label: "Open source", key: "oss", them: "Not listed as open source" },
    ],
    switchSteps: SWITCH("OpenTweet"),
    faqs: [
      [
        "Can Postbase schedule X threads like OpenTweet?",
        "Yes. Add up to 25 posts to a thread in the composer, or ask Claude to create one over MCP. Bluesky and Mastodon threads work the same way.",
      ],
      [
        "Does Postbase limit X posts?",
        "Plain posts and threads are unlimited. Posts with links are capped per plan, from 20 a month on Creator to 75 on Agency. OpenTweet's limits are daily: 20 posts, 10 of them with links, on Pro.",
      ],
      [
        "Do both work with Claude?",
        "Yes. OpenTweet's MCP server uses an API key. Postbase's hosted server lets you sign in with OAuth, or you can use the npm package with an API key.",
      ],
      [
        "Which is cheaper?",
        "For a single X account, OpenTweet: Pro is $15.99/month. If you post to several networks or more than 3 accounts, Postbase's Team plan is $39/month for 15 channels.",
      ],
    ],
    sources: [
      { label: "OpenTweet pricing", url: "https://opentweet.io/pricing" },
      { label: "OpenTweet docs", url: "https://opentweet.io/docs" },
      { label: "OpenTweet", url: "https://opentweet.io/" },
    ],
  },
  {
    slug: "blotato",
    name: "Blotato",
    blurb: "An AI content studio that repurposes and schedules for creators.",
    checked: "6 October 2026",
    metaTitle: "Blotato alternative: open source, with Mastodon",
    metaDescription:
      "Postbase vs Blotato: AI repurposing vs focused scheduling, price, networks, MCP and API access, and open source. When each one is the better pick.",
    h1: ["An open-source", "Blotato alternative"],
    sub: "Blotato turns sources into posts, images and videos with AI. Postbase focuses on writing and scheduling, is open source, and posts to Mastodon.",
    them: "Blotato is an AI content studio for creators: it repurposes videos, articles and posts into new content with AI images, video and voices, then schedules it.",
    chooseUs: [
      "You write your own posts and mainly need scheduling, a calendar and an API.",
      "You post to Mastodon, or want to self-host.",
      "You want an AI agent inside the app that drafts and schedules after you confirm.",
    ],
    chooseThem: [
      "You want AI to repurpose videos, articles and posts into new content, with AI images, video and voiceovers.",
      "You need Instagram, Facebook, Threads or Pinterest today.",
      "You want 20 accounts on the starting plan: Starter is $29/month.",
    ],
    rows: [
      { label: "Starting price", key: "price", them: "$29/month (Starter): 20 accounts and 1,250 AI credits" },
      { label: "Free plan", key: "free", them: "No: a 7-day trial, without API or MCP access" },
      { label: "How pricing scales", key: "scaling", them: "Tiers by AI credits and accounts: Creator is $97/month for 40 accounts" },
      {
        label: "Networks",
        key: "networks",
        them: "X, LinkedIn, Bluesky, TikTok, YouTube, Instagram, Facebook, Threads, Pinterest. No Mastodon",
      },
      { label: "MCP server", key: "mcp", them: "Yes, hosted, on paid plans. OAuth in Claude, an API key elsewhere" },
      { label: "Public API", key: "api", them: "Yes, on paid plans. Not included in the trial" },
      { label: "Open source", key: "oss", them: "No" },
    ],
    switchSteps: SWITCH("Blotato"),
    faqs: [
      [
        "Does Postbase repurpose content like Blotato?",
        "Not in the same way. Postbase's agent drafts posts from what you tell it and schedules them after you confirm, but it doesn't turn videos or articles into new media. If repurposing is your workflow, Blotato is the better fit.",
      ],
      [
        "Which is cheaper?",
        "Both start at $29/month. Blotato's Starter includes 20 accounts and AI credits. Postbase's Creator includes 5 channels, and Team is $39/month for 15 channels with team seats.",
      ],
      [
        "Do both work with Claude?",
        "Yes, both have a hosted MCP server with OAuth sign-in for Claude. Blotato's can post images and video to its nine networks; Postbase's MCP tools post text to X, LinkedIn, Bluesky and Mastodon.",
      ],
      [
        "Can I self-host Postbase?",
        "Yes. Postbase is open source; run it on your own servers with your own platform API keys.",
      ],
    ],
    sources: [
      { label: "Blotato pricing", url: "https://www.blotato.com/pricing" },
      { label: "Blotato MCP server", url: "https://www.blotato.com/mcp" },
      { label: "Blotato MCP FAQs", url: "https://help.blotato.com/start-with-an-ai-agent/mcp/faqs.md" },
    ],
  },
];

export const competitorBySlug = (slug: string) => COMPETITORS.find((c) => c.slug === slug);
