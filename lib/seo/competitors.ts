/*
 * "Alternative to X" pages. Drives /alternatives, /alternatives/[slug] and the
 * sitemap. Competitor facts come from their official pricing pages and docs,
 * checked on CHECKED; re-check before editing and keep the sources list current.
 * Be fair: every page says when the other tool is the better pick.
 */

export const CHECKED = "26 September 2026";

/** Postbase's side of every comparison table, keyed by row. */
export const US = {
  price: "$29/month for 5 channels, billed monthly or yearly",
  free: "No free hosted plan: a 7-day trial, or self-host for free",
  scaling: "Per plan, not per channel: 15 channels and team seats for $39/month",
  networks: "X, LinkedIn, Bluesky, Mastodon, TikTok, YouTube (Instagram, Facebook and Threads coming soon)",
  mcp: "Yes, on every plan. Sign in with Postbase or use an API key",
  api: "Yes, on every plan. Create a key on the Developers page",
  oss: "Yes. Self-host for free with your own platform keys",
};

export type Row = { label: string; key: keyof typeof US; them: string };

export type Competitor = {
  slug: string;
  name: string;
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
    metaTitle: "Buffer alternative: open-source, flat-priced social scheduler",
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
    metaTitle: "Hootsuite alternative: open-source scheduler from $29/month",
    metaDescription:
      "Comparing Postbase and Hootsuite: price, networks, API access, MCP and open source. An honest look at when you need Hootsuite and when a lighter scheduler is enough.",
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
        "Yes. Create a key on the Developers page and call the REST API straight away, on every plan.",
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
    metaTitle: "Ayrshare alternative: social media API and MCP from $29/month",
    metaDescription:
      "Comparing Postbase and Ayrshare for posting to social media from code or AI agents: price, MCP sign-in, networks and open source. When each one is the better pick.",
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
        body: "Create a key on the Developers page. It works for the REST API and the npm MCP server, and you can revoke it any time.",
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
];

export const competitorBySlug = (slug: string) => COMPETITORS.find((c) => c.slug === slug);
