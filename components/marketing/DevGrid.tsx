"use client";

import { useState } from "react";
import { ClientLogo } from "@/components/ClientLogo";
import { useLoop } from "@/components/marketing/Mocks";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { Tile, shot } from "@/components/marketing/CreatorGrid";

/*
 * The developers feature grid, same card style as the creators grid. Screens
 * mirror: McpClientConfig (hosted connector per client), the Developers page
 * tools reference, the calendar with MCP posts, the API docs, and the connected
 * apps + revoke dialog.
 */

export function DevGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-5">
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
        body="Posts your agent schedules sit next to yours, marked MCP. Review, edit or cancel them before they go out."
      >
        <div className="h-[560px] w-[900px] overflow-hidden rounded-2xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
          <CalendarDemo productShot sidebar={false} showAgent />
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
        layout="bottom"
        label="Access"
        title="Take access back in one click"
        body="Every app you've signed in from is listed on your Developers page. Revoke one and it's cut off immediately."
      >
        <div className="pt-16">
          <RevokeShot />
        </div>
      </Tile>
    </div>
  );
}

// ── MCP client configuration (hosted connector) ──────────────────────────

const MCP_URL = "https://www.postbase.so/api/mcp";
const CLIENTS = [
  { id: "claude", name: "Claude Desktop" },
  { id: "claude-code", name: "Claude Code" },
  { id: "cursor", name: "Cursor" },
  { id: "vscode", name: "VS Code" },
  { id: "windsurf", name: "Windsurf" },
  { id: "gemini", name: "Gemini CLI" },
];
// Same per-client setup the Developers page shows (VS Code's one-liner is skipped in the loop).
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

function McpShot() {
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

function ToolsShot() {
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
                <span className={`rounded px-1.5 py-0.5 font-semibold text-white ${method === "GET" ? "bg-green" : "bg-blue"}`}>{method}</span>
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

type AppRow = { name: string; sub: string };
const APPS: AppRow[] = [
  { name: "Claude", sub: "Halden Coffee · connected 23 Sep 2026 · last used 23 Sep 2026" },
  { name: "Cursor", sub: "Halden Coffee · connected 14 Sep 2026 · last used 22 Sep 2026" },
];

function RevokeShot() {
  const [dialog, setDialog] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setRevoked(false);
    setDialog(false);
    setPressed(false);
    await step(1600);
    setDialog(true);
    await step(1700);
    setPressed(true);
    await step(250);
    setDialog(false);
    setRevoked(true);
    await step(2600);
  });
  const apps = revoked ? APPS.filter((a) => a.name !== "Cursor") : APPS;
  return (
    <div ref={ref} className="relative w-[640px]">
      <div className={`${shot} overflow-hidden`}>
        <div className="border-b border-line px-5 py-4">
          <div className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">Connected apps</div>
          <p className="mt-0.5 text-[13px] text-muted">Tools you&apos;ve signed in to Postbase from. Revoking cuts off their access immediately.</p>
        </div>
        {apps.map((a, i) => (
          <div key={a.name} className={`flex items-center gap-3 px-5 py-3.5 ${i < apps.length - 1 ? "border-b border-line" : ""}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted" aria-hidden>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">{a.name}</div>
              <div className="mt-0.5 truncate text-xs text-muted">{a.sub}</div>
            </div>
            <span
              className={`ml-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                a.name === "Cursor" && dialog ? "bg-terra/10 text-terra" : "text-muted"
              }`}
            >
              Revoke
            </span>
          </div>
        ))}
        {revoked ? (
          <div className="swap-in border-t border-line px-5 py-3 text-[12.5px] text-muted">Cursor no longer has access to Halden Coffee.</div>
        ) : null}
      </div>

      {dialog ? (
        <div
          className="swap-in absolute left-24 top-6 w-[380px] rounded-2xl border border-line bg-surface p-6 shadow-lg"
          style={{
            backgroundImage: [
              "radial-gradient(120% 100% at 0% 0%, #d14a3e33, transparent 60%)",
              "radial-gradient(110% 90% at 100% 100%, #e3a72c2b, transparent 58%)",
            ].join(","),
          }}
        >
          <div className="text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full text-white" style={{ backgroundColor: "#d14a3e" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="m4.9 4.9 14.2 14.2" />
              </svg>
            </span>
            <div className="mt-4 font-display text-lg font-semibold tracking-[-0.01em] text-ink">Revoke Cursor?</div>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
              Cursor will immediately lose access to the <b className="text-ink">Halden Coffee</b> workspace. Any agent using this connection stops
              working until it&apos;s reconnected.
            </p>
          </div>
          <div className="mt-6 flex gap-2.5">
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
      ) : null}
    </div>
  );
}
