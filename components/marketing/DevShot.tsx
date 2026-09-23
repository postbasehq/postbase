"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/marketing/AppShell";
import { ClientLogo } from "@/components/ClientLogo";

/*
 * Product shot of the real Developers page (components/DeveloperClient.tsx +
 * McpClientConfig.tsx): the "On this page" menu, API keys, MCP client setup and
 * connected apps. It loops: a key is named and generated, the page scrolls to
 * the MCP setup and copies the connector URL, then Claude shows up as a
 * connected app.
 */

const MCP_URL = "https://www.postbase.so/api/mcp";

const CLIENTS = [
  { id: "claude", name: "Claude Desktop" },
  { id: "claude-code", name: "Claude Code" },
  { id: "cursor", name: "Cursor" },
  { id: "vscode", name: "VS Code" },
  { id: "windsurf", name: "Windsurf" },
  { id: "gemini", name: "Gemini CLI" },
];

const SECTIONS = [
  { id: "keys", label: "API keys" },
  { id: "mcp", label: "MCP client" },
  { id: "apps", label: "Connected apps" },
  { id: "tools", label: "Tools" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

type Key = { label: string; hint: string; created: string; used: string };
const START_KEYS: Key[] = [{ label: "Zapier workflow", hint: "pb_live_…9c1e", created: "02 Sep 2026", used: "22 Sep 2026" }];
const NEW_KEY: Key = { label: "Claude on my laptop", hint: "pb_live_…4f2a", created: "23 Sep 2026", used: "never" };

type App = { name: string; sub: string };
const START_APPS: App[] = [{ name: "Cursor", sub: "Halden Coffee · connected 14 Sep 2026 · last used 22 Sep 2026" }];
const NEW_APP: App = { name: "Claude", sub: "Halden Coffee · connected 23 Sep 2026 · last used 23 Sep 2026" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DevShot() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const reg = (k: string) => (el: HTMLElement | null) => {
    refs.current[k] = el;
  };

  const [inView, setInView] = useState(false);
  const [label, setLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [keys, setKeys] = useState<Key[]>(START_KEYS);
  const [apps, setApps] = useState<App[]>(START_APPS);
  const [copied, setCopied] = useState(false);
  const [scroll, setScroll] = useState(0);
  const [section, setSection] = useState<SectionId>("keys");
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, down: false });

  useEffect(() => {
    if (!rootRef.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(rootRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setKeys([NEW_KEY, ...START_KEYS]);
      setApps([NEW_APP, ...START_APPS]);
      return;
    }
    if (!inView) return;
    let cancelled = false;
    const step = async (ms: number) => {
      await sleep(ms);
      if (cancelled) throw new Error("stop");
    };
    const aim = (k: string, fx = 0.5, fy = 0.6) => {
      const el = refs.current[k];
      const root = rootRef.current;
      if (!el || !root) return;
      const a = el.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      setCursor((c) => ({ ...c, x: a.left - b.left + a.width * fx, y: a.top - b.top + a.height * fy, visible: true }));
    };
    const click = async () => {
      setCursor((c) => ({ ...c, down: true }));
      await step(140);
      setCursor((c) => ({ ...c, down: false }));
    };
    // Scroll the page column so a section sits at the top (clamped to the end).
    const scrollTo = (id: SectionId) => {
      const el = refs.current[id];
      const view = viewRef.current;
      if (!el || !view) return;
      const inner = view.firstElementChild as HTMLElement;
      const max = Math.max(0, inner.scrollHeight - view.clientHeight);
      setScroll(-Math.min(el.offsetTop, max));
      setSection(id);
    };

    (async () => {
      try {
        for (;;) {
          setLabel("");
          setGenerating(false);
          setRevealed(false);
          setKeys(START_KEYS);
          setApps(START_APPS);
          setCopied(false);
          setScroll(0);
          setSection("keys");
          setCursor((c) => ({ ...c, visible: false }));
          await step(1200);

          // Name and generate a key.
          aim("label", 0.3);
          await step(800);
          await click();
          for (let i = 1; i <= NEW_KEY.label.length; i++) {
            setLabel(NEW_KEY.label.slice(0, i));
            await step(45);
          }
          await step(300);
          aim("generate");
          await step(700);
          await click();
          setGenerating(true);
          await step(700);
          setGenerating(false);
          setRevealed(true);
          setKeys([NEW_KEY, ...START_KEYS]);
          setLabel("");
          await step(2000);

          // Copy the connector URL for Claude.
          setCursor((c) => ({ ...c, visible: false }));
          scrollTo("mcp");
          await step(900);
          aim("copy");
          await step(750);
          await click();
          setCopied(true);
          await step(1200);

          // Claude signs in and shows up as a connected app.
          setCursor((c) => ({ ...c, visible: false }));
          scrollTo("apps");
          await step(900);
          setApps([NEW_APP, ...START_APPS]);
          await step(3000);

          setScroll(0);
          setSection("keys");
          await step(900);
        }
      } catch {
        /* stopped */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inView]);

  const card = "overflow-hidden rounded-2xl border border-line bg-surface shadow-sm";
  const head = "flex flex-wrap items-start gap-3 border-b border-line px-5 py-4";
  const docs = (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[12px] font-semibold text-blue-ink">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <path d="M15 3h6v6M10 14 21 3" />
      </svg>
      Docs
    </span>
  );

  return (
    <AppShell active="/api-keys" title="Developers" workspace={{ name: "Halden Coffee", sub: "3 channels" }}>
      <div ref={rootRef} className="relative flex h-full flex-col px-6 pb-4 pt-1">
        <p className="max-w-2xl text-[13px] text-muted">
          Use your API key to automate Postbase — hook up an AI agent over MCP, script it from the CLI, or call the REST
          API directly.
        </p>

        <div className="mt-5 grid min-h-0 flex-1 gap-6 md:grid-cols-[150px_minmax(0,1fr)]">
          {/* on this page */}
          <nav className="hidden md:block">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">On this page</p>
            <ul className="flex flex-col gap-0.5">
              {SECTIONS.map((s) => (
                <li
                  key={s.id}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-300 ${
                    section === s.id ? "bg-surface-2 text-ink" : "text-muted"
                  }`}
                >
                  {s.label}
                </li>
              ))}
            </ul>
          </nav>

          {/* page column */}
          <div ref={viewRef} className="relative min-h-0 overflow-hidden">
            <div
              className="flex flex-col gap-5 pb-6"
              style={{ transform: `translateY(${scroll}px)`, transition: "transform 800ms cubic-bezier(0.3,0.7,0.2,1)" }}
            >
              {/* API keys */}
              <section ref={reg("keys")} className={card}>
                <div className={head}>
                  <div className="min-w-0">
                    <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">API keys</h2>
                    <p className="mt-0.5 text-[13px] text-muted">
                      A key authenticates the MCP server, the REST API, and the CLI. Shown once — store it safely.
                    </p>
                  </div>
                  {docs}
                </div>
                <div className="flex flex-col gap-4 p-5">
                  {revealed ? (
                    <div className="swap-in rounded-xl border border-blue bg-blue-soft/60 p-3.5">
                      <p className="text-[13px] font-semibold text-blue-ink">Copy your key now — you won&apos;t see it again.</p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono text-[12.5px] text-ink ring-1 ring-line">
                          pb_live_Qm7xT2vLr9KcH0sWbN8yJd3pA6fE4f2a
                        </code>
                        <span className="shrink-0 rounded-lg bg-blue px-3.5 py-2 text-[13px] font-semibold text-on-blue">Copy</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-1 flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-muted">New key label</span>
                      <span
                        ref={reg("label")}
                        className={`rounded-xl border bg-ground px-3.5 py-2.5 text-sm ${label ? "border-blue text-ink" : "border-line text-muted/70"}`}
                      >
                        {label || "e.g. Claude on my laptop"}
                      </span>
                    </label>
                    <span
                      ref={reg("generate")}
                      className={`rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm ${generating ? "opacity-60" : ""}`}
                    >
                      {generating ? "Generating…" : "Generate key"}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-line">
                    {keys.map((k, i) => (
                      <div
                        key={k.label}
                        className={`flex items-center gap-3 px-4 py-3 ${i < keys.length - 1 ? "border-b border-line" : ""} ${
                          k === NEW_KEY ? "swap-in" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink">{k.label}</span>
                            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">{k.hint}</code>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted">
                            Created {k.created} · last used {k.used}
                          </div>
                        </div>
                        <div className="ml-auto flex items-center gap-1 text-xs font-semibold text-muted">
                          <span className="rounded-lg px-2.5 py-1.5">Rotate</span>
                          <span className="rounded-lg px-2.5 py-1.5">Revoke</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* MCP client configuration */}
              <section ref={reg("mcp")} className={card}>
                <div className={head}>
                  <div className="min-w-0">
                    <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">MCP client configuration</h2>
                    <p className="mt-0.5 text-[13px] text-muted">
                      Connect the Postbase MCP server to your AI tool so it can schedule and publish for you.
                    </p>
                  </div>
                  {docs}
                </div>
                <div className="flex flex-col gap-5 p-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted">Authentication</p>
                    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/50 p-1">
                      <span className="rounded-full bg-blue px-3.5 py-1.5 text-xs font-semibold text-on-blue shadow-sm">
                        Sign in with Postbase
                      </span>
                      <span className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted">API key</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted">No key to manage — your tool signs in through Postbase.</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted">Client</p>
                    <div className="flex flex-wrap gap-2">
                      {CLIENTS.map((c) => {
                        const on = c.id === "claude";
                        return (
                          <span
                            key={c.id}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold ${
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
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted">
                      In Claude: Settings → Connectors → Add custom connector, and paste this URL. You&apos;ll sign in to
                      Postbase in a browser window — no API key.
                    </p>
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-ground py-2 pl-3.5 pr-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">{MCP_URL}</code>
                      <span className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-blue-ink">
                        Add to Claude
                      </span>
                      <span
                        ref={reg("copy")}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                          copied ? "bg-green text-white" : "bg-surface text-ink ring-1 ring-line"
                        }`}
                      >
                        {copied ? "Copied" : "Copy"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* connected apps */}
              <section ref={reg("apps")} className={card}>
                <div className="border-b border-line px-5 py-4">
                  <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">Connected apps</h2>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Tools you&apos;ve signed in to Postbase from. Revoking cuts off their access immediately.
                  </p>
                </div>
                {apps.map((a, i) => (
                  <div
                    key={a.name}
                    className={`flex items-center gap-3 px-5 py-3.5 ${i < apps.length - 1 ? "border-b border-line" : ""} ${
                      a === NEW_APP ? "swap-in" : ""
                    }`}
                  >
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
                    <span className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted">Revoke</span>
                  </div>
                ))}
              </section>
            </div>
          </div>
        </div>

        {/* cursor */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-30 drop-shadow-md"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px) scale(${cursor.down ? 0.85 : 1})`,
            opacity: cursor.visible ? 1 : 0,
            transition: "transform 650ms cubic-bezier(0.3,0.7,0.2,1), opacity 300ms ease",
          }}
        >
          <path d="M4 2.5 19 11l-6.6 1.9L9 19.5z" fill="#202124" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
    </AppShell>
  );
}
