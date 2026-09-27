/*
 * AI clients that connect to the Postbase MCP server. Drives /ai, /ai/[slug],
 * the sitemap, and the connector setup shown in the marketing product shots.
 * Setup steps mirror the hosted-connector config on the Developers page
 * (components/McpClientConfig.tsx); keep them in sync.
 */

export const MCP_URL = "https://mcp.postbase.so/mcp";

export type ClientSetup = {
  /** Label on the code block: "url" or "bash". */
  language: "url" | "bash";
  code: string;
  instruction: string;
  /** One-click button label shown in the product shot, if the client has one. */
  deeplink?: string;
};

export type AiClient = {
  slug: string;
  /** ClientLogo id. */
  logo: string;
  name: string;
  /** Where the client runs, for copy: "chat app", "terminal", "editor". */
  kind: "chat" | "terminal" | "editor";
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: [string, string];
  sub: string;
  setup: ClientSetup;
  steps: { title: string; body: string }[];
  prompts: string[];
  faqs: [string, string][];
};

const SIGN_IN_STEP = {
  title: "Sign in to Postbase",
  body: "A browser window opens. Sign in and pick the workspace the client may post to. There's no API key to copy or store.",
};

const ASK_STEP = (name: string) => ({
  title: "Ask for a post",
  body: `Tell ${name} what to post, where and when. It checks your channels, writes the post (or a separate version per network) and schedules it. Every post shows up in your Postbase calendar.`,
});

const COMMON_FAQS = (name: string): [string, string][] => [
  [
    `What can ${name} do in my Postbase account?`,
    `Four things: list your connected channels, create a draft or scheduled post (or thread), list what's queued, and cancel a scheduled post. It can't delete posts, disconnect accounts or change settings.`,
  ],
  [
    `Which networks can ${name} post to?`,
    "Text posts and threads go to X, LinkedIn, Bluesky and Mastodon. TikTok and YouTube need a video, so for those ask for a draft and add the video in the Postbase composer before it's scheduled.",
  ],
  [
    `How do I stop ${name} posting for me?`,
    `Open Developers → Connected apps in Postbase and click Revoke next to ${name}. Access ends immediately, and anything already scheduled stays in your calendar for you to keep or cancel.`,
  ],
  [
    "Do I need a paid Postbase plan?",
    "Every plan includes the MCP server, and every plan starts with a 7-day free trial. You can also self-host the open-source version for free.",
  ],
];

export const CLIENTS: AiClient[] = [
  {
    slug: "claude",
    logo: "claude",
    name: "Claude",
    kind: "chat",
    metaTitle: "Post to social media from Claude (MCP connector)",
    metaDescription:
      "Add Postbase to Claude as a custom connector and let Claude draft and schedule posts to X, LinkedIn, Bluesky and Mastodon. No API key, set up in a minute.",
    eyebrow: "Postbase for Claude",
    h1: ["Let Claude post to", "social media"],
    sub: "Add Postbase as a custom connector in Claude. Ask for a post in plain English and Claude writes it, fits it to each network and schedules it to the accounts you've connected.",
    setup: {
      language: "url",
      code: MCP_URL,
      instruction:
        "In Claude: Settings → Connectors → Add custom connector, and paste this URL. You'll sign in to Postbase in a browser window — no API key.",
      deeplink: "Add to Claude",
    },
    steps: [
      {
        title: "Add the connector",
        body: "In Claude on the web or desktop, open Settings → Connectors → Add custom connector. Name it Postbase and paste the server URL.",
      },
      SIGN_IN_STEP,
      ASK_STEP("Claude"),
    ],
    prompts: [
      "Turn this blog post into an X thread and a LinkedIn post, and schedule both for Tuesday at 9am.",
      "What's scheduled for this week? Anything going out on Friday afternoon?",
      "Write three Bluesky posts announcing our launch and space them a day apart.",
      "Cancel the LinkedIn post that's going out at 5pm today.",
      "Write a LinkedIn post about our hiring news and save it as a draft so I can add a photo.",
    ],
    faqs: [
      [
        "Does this work in Claude on the web, desktop and mobile?",
        "Custom connectors are added from Claude's settings on the web or desktop. Once added, the connector is available wherever you use Claude with that account.",
      ],
      [
        "Can Claude attach images or videos?",
        "Not yet. The connector handles text posts and threads. For media, ask Claude for a draft, then add the image or video in the Postbase composer and schedule it from there.",
      ],
      [
        "Can Claude post without asking me first?",
        "Claude asks before it calls a tool unless you've told it to always allow that tool. Everything it schedules also lands in your Postbase calendar, where you can edit or cancel it before it goes out.",
      ],
      ...COMMON_FAQS("Claude"),
    ],
  },
  {
    slug: "claude-code",
    logo: "claude-code",
    name: "Claude Code",
    kind: "terminal",
    metaTitle: "Schedule social posts from Claude Code (MCP server)",
    metaDescription: "One command adds Postbase to Claude Code. Turn changelogs into launch posts and schedule them to X, LinkedIn and Bluesky from your terminal.",
    eyebrow: "Postbase for Claude Code",
    h1: ["Ship it, then", "announce it"],
    sub: "Add Postbase to Claude Code with one command. It can read your changelog or diff, write the launch post for each network and schedule it, right from your terminal.",
    setup: {
      language: "bash",
      code: `claude mcp add --transport http postbase ${MCP_URL}`,
      instruction: "Run this — Claude Code opens a browser for you to sign in to Postbase.",
    },
    steps: [
      {
        title: "Add the server",
        body: "Run the command in your terminal. Claude Code registers Postbase as a remote MCP server over HTTP.",
      },
      SIGN_IN_STEP,
      ASK_STEP("Claude Code"),
    ],
    prompts: [
      "Read CHANGELOG.md and write a release thread for X and a LinkedIn post. Schedule them for 10am tomorrow.",
      "Summarise the commits since the last tag as a Bluesky post and save it as a draft.",
      "Post a short 'v2.3 is live' note to X and Mastodon right after this deploy finishes.",
      "List everything we have scheduled for launch week.",
    ],
    faqs: [
      [
        "Can I use an API key instead of signing in?",
        "Yes. Create a key on the Developers page and run the npm package instead: claude mcp add postbase --env POSTBASE_API_KEY=your_key -- npx @postbasehq/mcp. The hosted sign-in is simpler, and you can revoke it from the same page.",
      ],
      [
        "Can I post from a CI job or script?",
        "For automation without a model in the loop, call the REST API directly with an API key. It exposes the same actions as the MCP tools.",
      ],
      ...COMMON_FAQS("Claude Code"),
    ],
  },
  {
    slug: "cursor",
    logo: "cursor",
    name: "Cursor",
    kind: "editor",
    metaTitle: "Post to X, LinkedIn and Bluesky from Cursor (MCP)",
    metaDescription: "Add the Postbase MCP server to Cursor in one click, and let its agent write and schedule launch posts and threads to your social accounts.",
    eyebrow: "Postbase for Cursor",
    h1: ["Post from", "your editor"],
    sub: "Add Postbase to Cursor and its agent can turn what you just built into posts for X, LinkedIn, Bluesky and more, then schedule them for the right time.",
    setup: {
      language: "url",
      code: MCP_URL,
      instruction: "Add a custom MCP server in Cursor, or one-click below.",
      deeplink: "Add to Cursor",
    },
    steps: [
      {
        title: "Add the server",
        body: "Click Add to Cursor on the Postbase Developers page, or add a custom MCP server in Cursor's settings and paste the server URL.",
      },
      SIGN_IN_STEP,
      ASK_STEP("Cursor"),
    ],
    prompts: [
      "Look at the diff for this PR and write an X post about the new feature. Schedule it for tomorrow at noon.",
      "Draft a LinkedIn post about the performance work in this branch, with the numbers from the benchmark file.",
      "Turn docs/launch.md into a five-post X thread and save it as a draft.",
      "What's queued for next week?",
    ],
    faqs: [
      [
        "Does it work with Cursor's agent mode?",
        "Yes. Once the server is added and enabled, the agent can call the Postbase tools whenever you ask it to post, check the queue or cancel something.",
      ],
      ...COMMON_FAQS("Cursor"),
    ],
  },
  {
    slug: "vscode",
    logo: "vscode",
    name: "VS Code",
    kind: "editor",
    metaTitle: "Schedule social posts from VS Code (Copilot MCP)",
    metaDescription:
      "Add the Postbase MCP server to VS Code with one command and let GitHub Copilot's agent draft and schedule posts to X, LinkedIn, Bluesky and Mastodon.",
    eyebrow: "Postbase for VS Code",
    h1: ["Let Copilot", "post for you"],
    sub: "One command adds Postbase to VS Code. Copilot's agent can then write your release notes up as posts and schedule them to every network you use.",
    setup: {
      language: "bash",
      code: `code --add-mcp '${JSON.stringify({ name: "postbase", url: MCP_URL })}'`,
      instruction: "Run once to add the remote server to Copilot.",
    },
    steps: [
      {
        title: "Add the server",
        body: "Run the command once. It adds Postbase to VS Code's MCP configuration, where Copilot's agent mode can use it.",
      },
      SIGN_IN_STEP,
      ASK_STEP("Copilot"),
    ],
    prompts: [
      "Write an X post and a LinkedIn post about the feature in this file and schedule both for Thursday.",
      "Draft a Mastodon post for the new release and keep it under 500 characters.",
      "Show me what's scheduled for the rest of the week.",
      "Cancel tomorrow's X post.",
    ],
    faqs: COMMON_FAQS("Copilot"),
  },
  {
    slug: "windsurf",
    logo: "windsurf",
    name: "Windsurf",
    kind: "editor",
    metaTitle: "Post to social media from Windsurf (MCP server)",
    metaDescription:
      "Add the Postbase MCP server to Windsurf's Cascade agent and schedule posts to X, LinkedIn, Bluesky and more while you code.",
    eyebrow: "Postbase for Windsurf",
    h1: ["Give Cascade a", "publish button"],
    sub: "Add Postbase as a remote MCP server in Windsurf. Cascade can draft posts from your work and schedule them to the networks you've connected.",
    setup: {
      language: "url",
      code: MCP_URL,
      instruction: "In Windsurf, add a custom / remote MCP server and paste this URL.",
    },
    steps: [
      {
        title: "Add the server",
        body: "In Windsurf, open Cascade's MCP settings, add a custom server and paste the Postbase server URL.",
      },
      SIGN_IN_STEP,
      ASK_STEP("Cascade"),
    ],
    prompts: [
      "Write a launch post for X and Bluesky about what we built today and schedule it for 9am.",
      "Turn the README's feature list into a LinkedIn post and save it as a draft.",
      "What's going out tomorrow?",
    ],
    faqs: COMMON_FAQS("Cascade"),
  },
  {
    slug: "gemini-cli",
    logo: "gemini",
    name: "Gemini CLI",
    kind: "terminal",
    metaTitle: "Schedule social posts from Gemini CLI (MCP server)",
    metaDescription:
      "Add the Postbase MCP server to Gemini CLI with one command. Draft and schedule posts to X, LinkedIn, Bluesky and Mastodon from your terminal.",
    eyebrow: "Postbase for Gemini CLI",
    h1: ["Post from", "the terminal"],
    sub: "One command adds Postbase to Gemini CLI. Ask it to announce a release or schedule a week of posts, and it handles each network's version for you.",
    setup: {
      language: "bash",
      code: `gemini mcp add postbase --transport http ${MCP_URL}`,
      instruction: "Run this to add the remote server to Gemini CLI.",
    },
    steps: [
      {
        title: "Add the server",
        body: "Run the command in your terminal. Gemini CLI adds Postbase as a remote MCP server over HTTP.",
      },
      SIGN_IN_STEP,
      ASK_STEP("Gemini CLI"),
    ],
    prompts: [
      "Write a thread for X about today's release notes and schedule it for 10am.",
      "Draft one post for LinkedIn and one for Bluesky about our new docs site.",
      "List the posts scheduled for this week.",
    ],
    faqs: [
      [
        "Can I use an API key instead of signing in?",
        "Yes. Create a key on the Developers page and add the @postbasehq/mcp npm package to the mcpServers block of ~/.gemini/settings.json with POSTBASE_API_KEY set.",
      ],
      ...COMMON_FAQS("Gemini CLI"),
    ],
  },
];

export const clientBySlug = (slug: string) => CLIENTS.find((c) => c.slug === slug);
