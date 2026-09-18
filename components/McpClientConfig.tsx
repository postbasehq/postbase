"use client";

import { useMemo, useState } from "react";

/**
 * MCP client configuration generator. Picks a client and produces the exact
 * setup for our npx-stdio MCP server (`@postbasehq/mcp`) authenticated with an
 * API key. When a freshly-created/rotated key is available it's embedded
 * directly; otherwise a placeholder is shown for the user to paste.
 *
 * The OAuth ("Sign in with Postbase") auth mode is intentionally rendered but
 * disabled — it lights up in Phase 2 once the hosted remote MCP ships.
 */

const SERVER = "@postbasehq/mcp";
const KEY_PLACEHOLDER = "pb_live_YOUR_KEY";

type Built = {
  language: "json" | "bash";
  filename?: string;
  where: string;
  code: string;
  deeplink?: { label: string; href: string };
};

type Client = {
  id: string;
  name: string;
  accent: string;
  glyph: string;
  /** Domain used for the Brandfetch Logo Link CDN; falls back to the glyph. */
  domain: string;
  build: (key: string) => Built;
};

const serverObject = (key: string) => ({
  command: "npx",
  args: [SERVER],
  env: { POSTBASE_API_KEY: key },
});

const jsonBlock = (key: string) =>
  JSON.stringify({ mcpServers: { postbase: serverObject(key) } }, null, 2);

const b64 = (s: string) =>
  typeof window === "undefined" ? "" : window.btoa(s);

const CLIENTS: Client[] = [
  {
    id: "claude",
    domain: "claude.ai",
    name: "Claude Desktop",
    accent: "#d97757",
    glyph: "✳",
    build: (key) => ({
      language: "json",
      filename: "claude_desktop_config.json",
      where: "Settings → Developer → Edit Config, then restart Claude.",
      code: jsonBlock(key),
    }),
  },
  {
    id: "claude-code",
    domain: "claude.ai",
    name: "Claude Code",
    accent: "#d97757",
    glyph: "▚",
    build: (key) => ({
      language: "bash",
      where: "Run in your terminal — Claude Code registers the server globally.",
      code: `claude mcp add postbase --env POSTBASE_API_KEY=${key} -- npx ${SERVER}`,
    }),
  },
  {
    id: "cursor",
    domain: "cursor.com",
    name: "Cursor",
    accent: "#7c8894",
    glyph: "▲",
    build: (key) => ({
      language: "json",
      filename: "~/.cursor/mcp.json",
      where: "Settings → MCP → Add, or drop this into ~/.cursor/mcp.json.",
      code: jsonBlock(key),
      deeplink: {
        label: "Add to Cursor",
        href: `cursor://anysphere.cursor-deeplink/mcp/install?name=postbase&config=${encodeURIComponent(
          b64(JSON.stringify(serverObject(key))),
        )}`,
      },
    }),
  },
  {
    id: "vscode",
    domain: "code.visualstudio.com",
    name: "VS Code",
    accent: "#3b82f6",
    glyph: "❮❯",
    build: (key) => ({
      language: "bash",
      where: "Run once — adds the server to Copilot's MCP config.",
      code: `code --add-mcp '${JSON.stringify({ name: "postbase", ...serverObject(key) })}'`,
    }),
  },
  {
    id: "windsurf",
    domain: "windsurf.com",
    name: "Windsurf",
    accent: "#22c55e",
    glyph: "≋",
    build: (key) => ({
      language: "json",
      filename: "~/.codeium/windsurf/mcp_config.json",
      where: "Cascade → MCP servers → Configure, or edit the file directly.",
      code: jsonBlock(key),
    }),
  },
  {
    id: "gemini",
    domain: "gemini.google.com",
    name: "Gemini CLI",
    accent: "#4285f4",
    glyph: "✦",
    build: (key) => ({
      language: "json",
      filename: "~/.gemini/settings.json",
      where: "Merge into the mcpServers block of ~/.gemini/settings.json.",
      code: jsonBlock(key),
    }),
  },
];

/** Per-client setup for the hosted (OAuth) connector, keyed off the MCP URL. */
function remoteConfig(client: Client, url: string): {
  language: string;
  code: string;
  instruction: string;
  deeplink?: { label: string; href: string };
} {
  switch (client.id) {
    case "claude":
      return {
        language: "url",
        code: url,
        instruction:
          "In Claude: Settings → Connectors → Add custom connector, and paste this URL. You'll sign in to Postbase in a browser window — no API key.",
        deeplink: { label: "Add to Claude", href: "https://claude.ai/settings/connectors" },
      };
    case "claude-code":
      return {
        language: "bash",
        code: `claude mcp add --transport http postbase ${url}`,
        instruction: "Run this — Claude Code opens a browser for you to sign in to Postbase.",
      };
    case "cursor":
      return {
        language: "url",
        code: url,
        instruction: "Add a custom MCP server in Cursor, or one-click below.",
        deeplink: {
          label: "Add to Cursor",
          href: `cursor://anysphere.cursor-deeplink/mcp/install?name=postbase&config=${encodeURIComponent(
            b64(JSON.stringify({ url })),
          )}`,
        },
      };
    case "vscode":
      return {
        language: "bash",
        code: `code --add-mcp '${JSON.stringify({ name: "postbase", url })}'`,
        instruction: "Run once to add the remote server to Copilot.",
      };
    case "gemini":
      return {
        language: "bash",
        code: `gemini mcp add postbase --transport http ${url}`,
        instruction: "Run this to add the remote server to Gemini CLI.",
      };
    default:
      return {
        language: "url",
        code: url,
        instruction: `In ${client.name}, add a custom / remote MCP server and paste this URL.`,
      };
  }
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
    >
      {done ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

/**
 * Brandfetch Logo Link (CDN) with a graceful fallback to the accent glyph.
 * The CDN blocks non-browser traffic and may restrict the client id to
 * allow-listed domains, so any load failure quietly falls back.
 */
function ClientLogo({ client, brandfetchId }: { client: Client; brandfetchId?: string }) {
  const [failed, setFailed] = useState(false);
  const showLogo = brandfetchId && !failed;
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center overflow-hidden rounded-md text-[13px] font-bold ${
        showLogo ? "bg-white ring-1 ring-black/5" : ""
      }`}
      style={showLogo ? undefined : { backgroundColor: `${client.accent}22`, color: client.accent }}
      aria-hidden
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://cdn.brandfetch.io/${client.domain}/w/48/h/48/type/icon/fallback/404?c=${brandfetchId}`}
          alt=""
          width={18}
          height={18}
          className="size-[18px] object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        client.glyph
      )}
    </span>
  );
}

export function McpClientConfig({
  apiKey,
  brandfetchId,
  mcpUrl,
}: {
  apiKey: string | null;
  brandfetchId?: string;
  mcpUrl: string;
}) {
  const [clientId, setClientId] = useState("claude");
  const [authMode, setAuthMode] = useState<"oauth" | "apikey">("oauth");
  const key = apiKey ?? KEY_PLACEHOLDER;
  const client = CLIENTS.find((c) => c.id === clientId) ?? CLIENTS[0];
  const built = useMemo(() => client.build(key), [client, key]);
  const remote = useMemo(() => remoteConfig(client, mcpUrl), [client, mcpUrl]);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-start gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">
            MCP client configuration
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Connect the Postbase MCP server to your AI tool so it can schedule and publish for you.
          </p>
        </div>
        <a
          href="https://docs.postbase.so/mcp/connect"
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[13px] font-semibold text-blue-ink transition hover:bg-surface-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6M10 14 21 3" />
          </svg>
          Docs
        </a>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* Authentication mode */}
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">Authentication</p>
          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/50 p-1">
            {(
              [
                ["oauth", "Sign in with Postbase"],
                ["apikey", "API key"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAuthMode(mode)}
                aria-pressed={authMode === mode}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  authMode === mode
                    ? "bg-blue text-on-blue shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            {authMode === "oauth"
              ? "No key to manage — your tool signs in through Postbase."
              : "Embed a key in the client config (runs the server locally)."}
          </p>
        </div>

        {/* Client picker */}
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">Client</p>
          <div className="flex flex-wrap gap-2">
            {CLIENTS.map((c) => {
              const on = c.id === clientId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClientId(c.id)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition ${
                    on
                      ? "border-blue bg-blue-soft text-blue-ink shadow-sm"
                      : "border-line text-ink hover:border-blue/40 hover:bg-surface-2"
                  }`}
                >
                  <ClientLogo client={c} brandfetchId={brandfetchId} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generated config */}
        {authMode === "oauth" ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">{remote.instruction}</p>
            <div className="relative overflow-hidden rounded-xl bg-[#12141a] ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  {remote.language}
                </span>
                <div className="flex items-center gap-2">
                  {remote.deeplink ? (
                    <a
                      href={remote.deeplink.href}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue px-2.5 py-1.5 text-xs font-semibold text-on-blue transition hover:shadow"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                      {remote.deeplink.label}
                    </a>
                  ) : null}
                  <CopyButton text={remote.code} />
                </div>
              </div>
              <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-6 text-[#e6e8ef]">
                {remote.code}
              </pre>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs font-semibold text-muted">
                {built.filename ? (
                  <>
                    Paste into <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink">{built.filename}</code>
                  </>
                ) : (
                  "Run this"
                )}
              </p>
              <span className="ml-auto text-[11px] text-muted">{built.where}</span>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-[#12141a] ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  {built.language}
                </span>
                <div className="flex items-center gap-2">
                  {built.deeplink ? (
                    <a
                      href={built.deeplink.href}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue px-2.5 py-1.5 text-xs font-semibold text-on-blue transition hover:shadow"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                      {built.deeplink.label}
                    </a>
                  ) : null}
                  <CopyButton text={built.code} />
                </div>
              </div>
              <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-6 text-[#e6e8ef]">
                {built.code}
              </pre>
            </div>
            {!apiKey ? (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-bright" aria-hidden>
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
                Replace <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px] text-ink">{KEY_PLACEHOLDER}</code> with your key — generate or rotate one above to auto-fill it here.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
