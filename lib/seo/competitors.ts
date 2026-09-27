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
  {
    slug: "hypefury",
    name: "Hypefury",
    checked: "27 September 2026",
    metaTitle: "Hypefury alternative that still posts to X",
    metaDescription:
      "Hypefury no longer supports X. Postbase schedules X posts and threads, plus LinkedIn, Bluesky, Mastodon, TikTok and YouTube, with an AI agent and an MCP server.",
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
    checked: "27 September 2026",
    metaTitle: "Later alternative for X, Bluesky, Mastodon and AI agents",
    metaDescription:
      "Comparing Postbase and Later: networks (X, Bluesky and Mastodon vs Instagram and Pinterest), post limits, API and MCP, and open source. When each one is the better pick.",
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
    checked: "27 September 2026",
    metaTitle: "Sprout Social alternative: scheduling from $29/month",
    metaDescription:
      "Comparing Postbase and Sprout Social: price per seat vs per plan, networks, API access, MCP for Claude and ChatGPT, and open source. When each one is the better pick.",
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
    checked: "27 September 2026",
    metaTitle: "Publer alternative with an API and MCP on every plan",
    metaDescription:
      "Comparing Postbase and Publer: per-account vs flat pricing, networks, API and MCP access, and open source. An honest look at when each one is the better pick.",
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
    checked: "27 September 2026",
    metaTitle: "SocialBee alternative with an API, MCP and Mastodon",
    metaDescription:
      "Comparing Postbase and SocialBee: the same $29 starting price, but an API, an MCP server for AI agents, Mastodon support and open source. When each one is the better pick.",
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
    checked: "27 September 2026",
    metaTitle: "Post Bridge alternative: open source, with Mastodon",
    metaDescription:
      "Comparing Postbase and Post Bridge: price, networks (including Mastodon), MCP and API, open source, and the built-in AI agent. When each one is the better pick.",
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
];

export const competitorBySlug = (slug: string) => COMPETITORS.find((c) => c.slug === slug);
