"use client";

import { useEffect, useState } from "react";
import { ClientLogo } from "@/components/ClientLogo";
import { BrandTile } from "@/components/BrandTile";
import { GITHUB_PATH } from "@/components/PlanPicker";
import { useLoop } from "@/components/marketing/Mocks";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { Tile, shot } from "@/components/marketing/CreatorGrid";

/*
 * The developers feature grid, same card style as the creators grid. Screens
 * mirror: McpClientConfig (hosted connector per client), the AI & API page
 * tools reference, the calendar with MCP posts, the API docs, and the connected
 * apps + revoke dialog.
 */

/**
 * "Which one do I use?" in one glance, above the developer tiles: MCP for AI
 * clients working conversationally, REST for your own code calling directly.
 * Solid brand panels like the tiles below: a big title, one high-contrast line
 * and a small, accurate demo. Nothing decorative sits behind the text.
 */
export function McpOrRest() {
  return (
    <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* MCP: a request in chat, answered by a real tool call */}
      {/* min-w-0: grid items otherwise grow to their widest line (the chat demo), past a phone's width */}
      <div className="flex min-w-0 flex-col rounded-[28px] bg-[#2b59d9] p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-display text-[clamp(28px,2.8vw,36px)] font-semibold leading-[1.1] tracking-[-0.02em] text-white">MCP</h3>
          {/* The AI tools that connect over MCP, as white tiles */}
          {/* Wraps on phones, where seven tiles are wider than the card. */}
          <span className="flex flex-wrap items-center gap-2">
            {/* Claude, then ChatGPT; Claude Code (CLIENTS[1]) shares Claude's mark, so it's skipped */}
            {[CLIENTS[0], { id: "chatgpt", name: "ChatGPT" }, ...CLIENTS.slice(2)].map((c) => (
              <span key={c.id} title={c.name} className="rounded-md shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]">
                <ClientLogo id={c.id} size={34} />
              </span>
            ))}
          </span>
        </div>
        <p className="mt-3 max-w-[40ch] text-[18px] leading-relaxed text-white">
          For when you want Claude, Cursor or another AI client to use Postbase conversationally.
        </p>
        <div className="h-7 shrink-0" aria-hidden />
        <div className="mt-auto">
          <ClaudeChatShot />
        </div>
      </div>

      {/* Right column: REST on top, open source underneath. On lg it takes no height of its own
          (absolutely filled), so the MCP card alone sets the row height and never grows. */}
      <div className="lg:relative">
      <div className="flex flex-col gap-5 lg:absolute lg:inset-0">
      {/* REST: the actual request and response */}
      <div className="flex min-w-0 flex-col rounded-[28px] bg-[#e3a72c] p-7 lg:flex-1">
        <h3 className="font-display text-[clamp(26px,2.4vw,32px)] font-semibold leading-[1.1] tracking-[-0.02em] text-[#14161a]">REST API</h3>
        <p className="mt-2 text-[16px] leading-relaxed text-[#14161a]">
          For when you want your own scripts, apps, automations or cron jobs to call Postbase directly.
        </p>
        <div className="h-4 shrink-0" aria-hidden />
        <div className="mt-auto overflow-hidden rounded-2xl bg-[#14161a] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)]">
          <pre className="overflow-x-auto px-4 py-3 font-mono text-[12px] leading-[1.7]" style={{ color: "#e8eaed" }}>
            <span className="text-[#9aa0a6]">$ </span>curl -X POST https://www.postbase.so/api/v1/posts \{"\n"}
            {"  "}-H <span className="text-[#f2c464]">&quot;Authorization: Bearer pb_live_…&quot;</span> \{"\n"}
            {"  "}-d <span className="text-[#f2c464]">&apos;{"{"}&quot;body&quot;:&quot;We just launched&quot;,&quot;channel_ids&quot;:[…]{"}"}&apos;</span>
            {"\n"}
            <span className="text-[#7fcf8f]">201 Created</span>
          </pre>
        </div>
      </div>

      <OpenSourceCard />
      </div>
      </div>
    </div>
  );
}

/** The third option: read the code, or run it yourself. Live star count from the same endpoint as the nav. */
function OpenSourceCard() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/github/stars")
      .then((r) => r.json())
      .then((d: { stars: number | null }) => {
        if (alive && typeof d.stars === "number") setStars(d.stars);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex flex-col rounded-[28px] bg-[#d14a3e] p-7 lg:flex-1">
      <h3 className="font-display text-[clamp(26px,2.4vw,32px)] font-semibold leading-[1.1] tracking-[-0.02em] text-white">Open source</h3>
      <p className="mt-2 text-[16px] leading-relaxed text-white">Read the code that posts for you, or self-host it.</p>
      <div className="h-4 shrink-0" aria-hidden />
      <div className="mt-auto flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 pl-4 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#14161a] text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d={GITHUB_PATH} />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block whitespace-nowrap font-mono text-[12.5px] font-semibold text-[#14161a]">postbasehq/postbase</span>
          <span className="flex items-center gap-2 text-[12px] text-[#5f6368]">
            AGPL-3.0
            {stars != null ? (
              <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#e3a72c" aria-hidden>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {stars}
              </span>
            ) : null}
          </span>
        </span>
        <span className="flex gap-2">
          <a
            href="https://docs.postbase.so/self-hosting/installation"
            className="rounded-full border border-[#e4e6eb] px-3 py-2 font-display text-[13px] font-semibold text-[#14161a] transition-colors hover:border-[#14161a]"
          >
            Self-host
          </a>
          <a
            href="https://github.com/postbasehq/postbase"
            className="rounded-full bg-[#14161a] px-3 py-2 font-display text-[13px] font-semibold text-white transition-shadow hover:shadow-md"
          >
            View on GitHub
          </a>
        </span>
      </div>
    </div>
  );
}

const ASK = "Schedule our launch post on X and LinkedIn for 9am tomorrow";
const REPLY = "Done. Your launch post is scheduled for 9:00 tomorrow on X and LinkedIn, and it's in your Postbase calendar.";

/**
 * A Claude-style chat, animated: the request types into the composer, is sent,
 * Postbase's tools run (list channels, then create the post), and the reply
 * streams in. Reduced motion shows the finished conversation.
 */
function ClaudeChatShot() {
  const [typed, setTyped] = useState("");
  const [sent, setSent] = useState(false);
  const [tools, setTools] = useState(0); // 0 none, 1 listing, 2 listed + creating, 3 both done
  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState("");
  const [ref, motion] = useLoop<HTMLDivElement>(async (step) => {
    setTyped("");
    setSent(false);
    setTools(0);
    setThinking(false);
    setReply("");
    await step(700);
    for (let i = 1; i <= ASK.length; i++) {
      setTyped(ASK.slice(0, i));
      await step(28);
    }
    await step(350);
    setSent(true);
    setTyped("");
    await step(500);
    setThinking(true);
    await step(700);
    setTools(1);
    await step(900);
    setTools(2);
    await step(1000);
    setTools(3);
    setThinking(false);
    await step(300);
    const words = REPLY.split(" ");
    for (let i = 1; i <= words.length; i++) {
      setReply(words.slice(0, i).join(" "));
      await step(55);
    }
    await step(3200);
  });

  // Reduced motion: the finished conversation, still.
  const still = !motion;
  const show = {
    sent: still || sent,
    tools: still ? 3 : tools,
    thinking: !still && thinking,
    reply: still ? REPLY : reply,
    typed: still ? "" : typed,
  };

  const tool = (label: string, state: "run" | "done") => (
    <div className="flex items-center gap-2.5 text-[13px] text-[#a8a6a1]">
      {state === "run" ? (
        <span className="size-1.5 animate-pulse rounded-full bg-[#d97757]" aria-hidden />
      ) : (
        <span className="size-1.5 rounded-full bg-[#5f5d59]" aria-hidden />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/postbase-icon.png" alt="" className="size-4 rounded-[4px]" />
      {label}
    </div>
  );

  return (
    <div
      ref={ref}
      className="flex h-[300px] flex-col overflow-hidden rounded-2xl bg-[#1f1f1e] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)]"
      aria-label="Claude scheduling a post with Postbase"
    >
      {/* Pinned to the bottom like a real chat: on narrow screens the oldest lines scroll off the top. */}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 pt-4">
        {show.sent ? (
          <p className="ml-auto max-w-[85%] rounded-2xl bg-[#2f2f2d] px-3.5 py-2 text-[13.5px] leading-snug text-[#ecebe8]">{ASK}</p>
        ) : null}
        {show.tools >= 1 ? tool("List channels", show.tools === 1 ? "run" : "done") : null}
        {show.tools >= 2 ? tool("Create post", show.tools === 2 ? "run" : "done") : null}
        {show.reply ? (
          <p className="font-serif text-[14.5px] leading-relaxed text-[#ecebe8]" style={{ fontFamily: "ui-serif, Georgia, 'Times New Roman', serif" }}>
            {show.reply}
          </p>
        ) : null}
        {show.thinking || (show.sent && show.tools === 0) ? (
          <span className="mt-1 w-fit animate-pulse">
            <ClientLogo id="claude" size={22} bare />
          </span>
        ) : null}
        {show.reply === REPLY ? (
          <span className="flex items-center gap-1.5">
            <BrandTile platform="x" size={20} radius={5} />
            <BrandTile platform="linkedin" size={20} radius={5} />
          </span>
        ) : null}
      </div>
      {/* Composer */}
      <div className="m-3 flex items-center gap-3 rounded-2xl border border-[#3a3a37] bg-[#262624] px-3.5 py-2.5">
        <span className="text-[16px] leading-none text-[#a8a6a1]" aria-hidden>
          +
        </span>
        <span className={`min-w-0 flex-1 truncate text-[13.5px] ${show.typed ? "text-[#ecebe8]" : "text-[#7c7a75]"}`}>
          {show.typed || "Write a message…"}
          {show.typed ? <span className="ml-px inline-block h-[14px] w-px translate-y-[2px] animate-pulse bg-[#ecebe8]" /> : null}
        </span>
        <span
          className={`flex size-7 items-center justify-center rounded-lg transition-colors ${show.typed ? "bg-[#d97757] text-white" : "bg-[#3a3a37] text-[#7c7a75]"}`}
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function DevGrid() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-5">
      <Tile
        className="md:col-span-3"
        tone="blue"
        layout="top"
        label="MCP"
        title="Connect the tool you already use"
        body="Claude, Claude Code, Cursor, VS Code, Windsurf or Gemini CLI. Sign in with Postbase and your agent can post, with no key to paste."
      >
        <McpShot />
      </Tile>
      <Tile
        className="md:col-span-2"
        tone="amber"
        layout="bottom"
        label="Tools"
        title="Four tools, nothing surprising"
        body="List channels, create posts and threads, check the queue and cancel a post. Your agent can't delete anything or change your account."
      >
        <div className="pt-16">
          <ToolsShot />
        </div>
      </Tile>
      <Tile
        className="md:col-span-5"
        tone="red"
        layout="side"
        label="Calendar"
        title="Every agent post lands in your calendar"
        body="Posts your agent schedules sit on the same calendar as yours. Review, edit or cancel them before they go out."
      >
        <div className="h-[560px] w-[900px] overflow-hidden rounded-2xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
          <CalendarDemo productShot sidebar={false} showAgent fromHour={11} />
        </div>
      </Tile>
      <Tile
        className="md:col-span-2"
        tone="amber"
        layout="top"
        label="REST API"
        title="Plain HTTPS for everything else"
        body="Four endpoints and a bearer key. Call them from a script, a cron job or your own app."
      >
        <DocsShot />
      </Tile>
      <Tile
        className="md:col-span-3"
        tone="blue"
        layout="top"
        label="Access"
        title="Take access back in one click"
        body="Every app you've signed in from is listed on your AI & API page. Revoke one and it's cut off immediately."
      >
        <RevokeShot />
      </Tile>
    </div>
  );
}

// ── MCP client configuration (hosted connector) ──────────────────────────

const MCP_URL = "https://mcp.postbase.so/mcp";
const CLIENTS = [
  { id: "claude", name: "Claude Desktop" },
  { id: "claude-code", name: "Claude Code" },
  { id: "cursor", name: "Cursor" },
  { id: "vscode", name: "VS Code" },
  { id: "windsurf", name: "Windsurf" },
  { id: "gemini", name: "Gemini CLI" },
];
// Same per-client setup the AI & API page shows (VS Code's one-liner is skipped in the loop).
const REMOTE: Record<string, { language: string; code: string; instruction: string; deeplink?: string }> = {
  claude: {
    language: "url",
    code: MCP_URL,
    instruction:
      "In Claude: Settings → Connectors → Add custom connector, and paste this URL. You'll sign in to Postbase in a browser window — no API key.",
    deeplink: "Add to Claude",
  },
  "claude-code": {
    language: "bash",
    code: `claude mcp add --transport http postbase ${MCP_URL}`,
    instruction: "Run this — Claude Code opens a browser for you to sign in to Postbase.",
  },
  cursor: {
    language: "url",
    code: MCP_URL,
    instruction: "Add a custom MCP server in Cursor, or one-click below.",
    deeplink: "Add to Cursor",
  },
  windsurf: {
    language: "url",
    code: MCP_URL,
    instruction: "In Windsurf, add a custom / remote MCP server and paste this URL.",
  },
  gemini: {
    language: "bash",
    code: `gemini mcp add postbase --transport http ${MCP_URL}`,
    instruction: "Run this to add the remote server to Gemini CLI.",
  },
};
const LOOP_CLIENTS = ["claude", "claude-code", "cursor", "windsurf", "gemini"];

export function McpShot() {
  const [client, setClient] = useState("claude");
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    for (const c of LOOP_CLIENTS) {
      setClient(c);
      await step(2200);
    }
  });
  const r = REMOTE[client];
  return (
    <div ref={ref} className={`${shot} w-[720px] overflow-hidden`}>
      <div className="border-b border-line px-5 py-4">
        <div className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">MCP client configuration</div>
        <p className="mt-0.5 text-[13px] text-muted">Connect the Postbase MCP server to your AI tool so it can schedule and publish for you.</p>
      </div>
      <div className="flex flex-col gap-5 p-5">
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">Authentication</p>
          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/50 p-1">
            <span className="rounded-full bg-blue px-3.5 py-1.5 text-xs font-semibold text-on-blue shadow-sm">Sign in with Postbase</span>
            <span className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted">API key</span>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">Client</p>
          <div className="flex flex-wrap gap-2">
            {CLIENTS.map((c) => {
              const on = c.id === client;
              return (
                <span
                  key={c.id}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors duration-300 ${
                    on ? "border-blue bg-blue-soft text-blue-ink shadow-sm" : "border-line text-ink"
                  }`}
                >
                  <ClientLogo id={c.id} size={24} />
                  {c.name}
                </span>
              );
            })}
          </div>
        </div>
        <div key={client} className="swap-in">
          <p className="mb-2 text-xs font-semibold text-muted">{r.instruction}</p>
          <div className="overflow-hidden rounded-xl bg-[#12141a] ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{r.language}</span>
              <div className="flex items-center gap-2">
                {r.deeplink ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue px-2.5 py-1.5 text-xs font-semibold text-on-blue">
                    {r.deeplink}
                  </span>
                ) : null}
                <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white">Copy</span>
              </div>
            </div>
            <pre className="overflow-hidden px-4 py-3.5 font-mono text-[12.5px] leading-6 text-[#e6e8ef]">{r.code}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tools reference ──────────────────────────────────────────────────────

const TOOLS = [
  { name: "list_channels", desc: "See connected accounts and their platforms." },
  { name: "create_post", desc: "Draft or schedule a post/thread to any channels." },
  { name: "list_scheduled", desc: "Review what's queued to publish." },
  { name: "cancel_post", desc: "Pull a scheduled post before it goes out." },
];

export function ToolsShot() {
  const [hot, setHot] = useState(1);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    for (let i = 0; i < TOOLS.length; i++) {
      setHot(i);
      await step(1500);
    }
  });
  return (
    <div ref={ref} className={`${shot} w-[440px] px-5`}>
      <div className="flex items-center gap-2 py-4 font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
        What can my agent call?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto rotate-180 text-muted" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      <div className="flex flex-col gap-2 border-t border-line pb-5 pt-4">
        {TOOLS.map((t, i) => (
          <div
            key={t.name}
            className={`flex items-baseline gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-300 ${i === hot ? "bg-blue-soft" : ""}`}
          >
            <code className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-blue-ink">{t.name}</code>
            <span className="text-[12.5px] leading-snug text-muted">{t.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── API docs ─────────────────────────────────────────────────────────────

const ENDPOINTS: [string, string, string][] = [
  ["List posts", "GET", "/api/v1/posts"],
  ["Create a post", "POST", "/api/v1/posts"],
  ["Cancel a post", "POST", "/api/v1/posts/{id}/cancel"],
];

function DocsShot() {
  const [hot, setHot] = useState(1);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    for (let i = 0; i < ENDPOINTS.length; i++) {
      setHot(i);
      await step(1700);
    }
  });
  return (
    <div ref={ref} className={`${shot} flex w-[600px] overflow-hidden`}>
      <nav className="w-[170px] shrink-0 border-r border-line bg-ground px-3 py-4 text-[12.5px]">
        <div className="flex items-center gap-2 px-2 pb-4 font-display text-[14px] font-semibold text-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/postbase-icon.png" alt="" className="size-5 rounded-[24%]" />
          Docs
        </div>
        <p className="px-2 pb-1.5 text-[11px] font-semibold text-ink">MCP &amp; agents</p>
        {["Overview", "Connect", "Tools"].map((x) => (
          <p key={x} className="rounded-md px-2 py-1 text-muted">
            {x}
          </p>
        ))}
        <p className="px-2 pb-1.5 pt-3 text-[11px] font-semibold text-ink">Public API</p>
        {["Authentication", "Posts", "Channels"].map((x) => (
          <p key={x} className={`rounded-md px-2 py-1 ${x === "Posts" ? "bg-blue-soft font-semibold text-blue-ink" : "text-muted"}`}>
            {x}
          </p>
        ))}
      </nav>
      <div className="min-w-0 flex-1 p-5">
        <div className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">Posts</div>
        <p className="mt-1 text-[13px] text-muted">Create, list, and cancel scheduled posts.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {ENDPOINTS.map(([title, method, path], i) => (
            <div
              key={title}
              className={`rounded-xl border px-3.5 py-3 transition-colors duration-300 ${i === hot ? "border-blue bg-blue-soft/50" : "border-line"}`}
            >
              <div className="font-display text-[14px] font-semibold text-ink">{title}</div>
              <div className="mt-1.5 flex items-center gap-2 font-mono text-[12px]">
                <span className={`rounded px-1.5 py-0.5 font-semibold text-white ${method === "GET" ? "bg-[#188038]" : "bg-[#2b59d9]"}`}>{method}</span>
                <span className="truncate text-ink">{path}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-muted">
          Authorization: <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11.5px] text-ink">Bearer pb_live_…</code>
        </p>
      </div>
    </div>
  );
}

// ── Connected apps + revoke ──────────────────────────────────────────────

type AppRow = { name: string; logo: string; sub: string };
const APPS: AppRow[] = [
  { name: "Claude", logo: "claude", sub: "Halden Coffee · connected 23 Sep 2026 · last used 23 Sep 2026" },
  { name: "Cursor", logo: "cursor", sub: "Halden Coffee · connected 14 Sep 2026 · last used 22 Sep 2026" },
  { name: "ChatGPT", logo: "chatgpt", sub: "Halden Coffee · connected 18 Sep 2026 · last used 21 Sep 2026" },
];

/**
 * The AI & API page's connected apps, as a fixed-size window: the revoke
 * dialog opens centred inside it over a dimmed backdrop (never outside it),
 * and the revoked row stays in place, greyed out, so nothing jumps.
 */
export function RevokeShot() {
  const [dialog, setDialog] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setRevoked(false);
    setDialog(false);
    setPressed(false);
    await step(1600);
    setDialog(true);
    await step(1900);
    setPressed(true);
    await step(250);
    setDialog(false);
    setPressed(false);
    setRevoked(true);
    await step(2800);
  });
  return (
    <div ref={ref} className={`${shot} relative h-[420px] w-[640px] overflow-hidden`}>
      <div className="border-b border-line px-5 py-4">
        <div className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">Connected apps</div>
        <p className="mt-0.5 text-[13px] text-muted">Tools you&apos;ve signed in to Postbase from. Revoking cuts off their access immediately.</p>
      </div>
      {APPS.map((a, i) => {
        const gone = revoked && a.name === "Cursor";
        return (
          <div key={a.name} className={`flex items-center gap-3 px-5 py-3.5 transition-opacity duration-500 ${i < APPS.length - 1 ? "border-b border-line" : ""} ${gone ? "opacity-50" : ""}`}>
            <ClientLogo id={a.logo} size={36} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">{a.name}</div>
              <div className="mt-0.5 truncate text-xs text-muted">{gone ? "Access revoked just now" : a.sub}</div>
            </div>
            <span
              className={`ml-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                gone ? "text-muted" : a.name === "Cursor" && dialog ? "bg-[#fbe9e7] text-[#b3382d]" : "text-muted"
              }`}
            >
              {gone ? "Revoked" : "Revoke"}
            </span>
          </div>
        );
      })}

      {/* The dialog lives inside the window, over a dimmed backdrop. */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-[#14161a]/35 p-6 transition-opacity duration-300 ${dialog ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!dialog}
      >
        <div className={`w-[360px] rounded-2xl border border-line bg-surface p-6 shadow-lg transition-transform duration-300 ${dialog ? "scale-100" : "scale-95"}`}>
          <div className="text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-full text-white" style={{ backgroundColor: "#d14a3e" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="m4.9 4.9 14.2 14.2" />
              </svg>
            </span>
            <div className="mt-3.5 font-display text-lg font-semibold tracking-[-0.01em] text-ink">Revoke Cursor?</div>
            <p className="mx-auto mt-1.5 text-[13px] leading-relaxed text-muted">
              Cursor will immediately lose access to <b className="text-ink">Halden Coffee</b>. Any agent using this connection stops working until
              it&apos;s reconnected.
            </p>
          </div>
          <div className="mt-5 flex gap-2.5">
            <span className="flex-1 rounded-full border border-line px-4 py-2.5 text-center text-sm font-medium text-muted">Cancel</span>
            <span
              className={`flex-1 rounded-full bg-[#d14a3e] px-5 py-2.5 text-center font-display text-sm font-semibold text-white shadow-sm transition-transform ${
                pressed ? "scale-95" : ""
              }`}
            >
              Revoke access
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
