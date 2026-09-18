"use client";

import { useActionState, useEffect, useState } from "react";
import { McpClientConfig } from "@/components/McpClientConfig";
import { Modal } from "@/components/Modal";
import {
  createApiKey,
  rotateApiKey,
  revokeApiKey,
  revokeConnectedApp,
  type CreateKeyState,
} from "@/app/(app)/apikey-actions";
import { SubmitButton } from "@/components/SubmitButton";

type KeyRow = {
  id: string;
  label: string | null;
  key_hint: string | null;
  created_at: string;
  last_used_at: string | null;
};

type ConnectedApp = {
  id: string;
  appName: string;
  orgName: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
};

type Section = { id: string; label: string };

/** Sticky in-page menu with scrollspy: highlights the section in view and
 *  smooth-scrolls within the app's scrollable <main> on click. */
function SideMenu({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el != null,
    );
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-72px 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="hidden lg:block">
      <div className="sticky top-0">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          On this page
        </p>
        <ul className="flex flex-col gap-0.5">
          {sections.map((s) => {
            const on = active === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActive(s.id);
                  }}
                  className={`block rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                    on ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

const MCP_TOOLS = [
  { name: "list_channels", desc: "See connected accounts and their platforms." },
  { name: "create_post", desc: "Draft or schedule a post/thread to any channels." },
  { name: "list_scheduled", desc: "Review what's queued to publish." },
  { name: "cancel_post", desc: "Pull a scheduled post before it goes out." },
];

function fmt(iso: string | null) {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function RevealedKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-blue bg-blue-soft/60 p-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-blue-ink">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
        Copy your key now — you won't see it again.
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2.5 font-mono text-[13px] ring-1 ring-line">
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            } catch {
              /* clipboard blocked */
            }
          }}
          className="shrink-0 rounded-lg bg-blue px-3.5 py-2.5 text-[13px] font-semibold text-on-blue transition hover:shadow"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function DeveloperClient({
  keys,
  brandfetchId,
  mcpUrl,
  connectedApps = [],
}: {
  keys: KeyRow[];
  brandfetchId?: string;
  mcpUrl: string;
  connectedApps?: ConnectedApp[];
}) {
  const [createState, createAction, creating] = useActionState<CreateKeyState, FormData>(
    createApiKey,
    {},
  );
  const [rotateState, rotateAction, rotating] = useActionState<CreateKeyState, FormData>(
    rotateApiKey,
    {},
  );

  // Whichever action last minted a key is the one we reveal + embed downstream.
  const [revealed, setRevealed] = useState<string | null>(null);
  useEffect(() => {
    if (createState.key) setRevealed(createState.key);
  }, [createState.key]);
  useEffect(() => {
    if (rotateState.key) setRevealed(rotateState.key);
  }, [rotateState.key]);

  const error = createState.error ?? rotateState.error;
  const [revokeTarget, setRevokeTarget] = useState<ConnectedApp | null>(null);

  const sections: Section[] = [
    { id: "api-keys", label: "API keys" },
    { id: "mcp", label: "MCP client" },
    ...(connectedApps.length > 0 ? [{ id: "apps", label: "Connected apps" }] : []),
    { id: "tools", label: "Tools" },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[160px_minmax(0,1fr)]">
      <SideMenu sections={sections} />

      <div className="flex min-w-0 flex-col gap-6 pb-8">
      {/* ── API Key card ─────────────────────────────────────── */}
      <section id="api-keys" className="scroll-mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">API keys</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              A key authenticates the MCP server, the REST API, and the CLI. Shown once — store it safely.
            </p>
          </div>
          <a
            href="https://github.com/postbasehq/postbase"
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

        <div className="flex flex-col gap-4 p-5">
          {revealed ? <RevealedKey value={revealed} /> : null}

          {/* create */}
          <form action={createAction} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted">New key label</span>
              <input
                name="label"
                placeholder="e.g. Claude on my laptop"
                className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
            >
              {creating ? "Generating…" : "Generate key"}
            </button>
          </form>
          {error ? <p className="text-[13px] text-terra">{error}</p> : null}

          {/* list */}
          {keys.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-line">
              {keys.map((k, i) => (
                <div
                  key={k.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                    i < keys.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{k.label ?? "Key"}</span>
                      {k.key_hint ? (
                        <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
                          {k.key_hint}
                        </code>
                      ) : null}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted">
                      Created {fmt(k.created_at)} · last used {fmt(k.last_used_at)}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <form action={rotateAction}>
                      <input type="hidden" name="id" value={k.id} />
                      <input type="hidden" name="label" value={k.label ?? "Default"} />
                      <button
                        type="submit"
                        disabled={rotating}
                        title="Revoke this key and mint a replacement"
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M3 2v6h6M21 12A9 9 0 0 0 6 5.3L3 8" />
                          <path d="M21 22v-6h-6M3 12a9 9 0 0 0 15 6.7l3-2.7" />
                        </svg>
                        Rotate
                      </button>
                    </form>
                    <form action={revokeApiKey}>
                      <input type="hidden" name="id" value={k.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-terra/10 hover:text-terra"
                      >
                        Revoke
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-surface-2/40 px-4 py-6 text-center text-sm text-muted">
              No API keys yet — generate one to get started.
            </p>
          )}
        </div>
      </section>

      {/* ── MCP client configuration ─────────────────────────── */}
      <div id="mcp" className="scroll-mt-4">
        <McpClientConfig apiKey={revealed} brandfetchId={brandfetchId} mcpUrl={mcpUrl} />
      </div>

      {/* ── Connected apps (OAuth tokens) ────────────────────── */}
      {connectedApps.length > 0 ? (
        <section id="apps" className="scroll-mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">Connected apps</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Tools you've signed in to Postbase from. Revoking cuts off their access immediately.
            </p>
          </div>
          <div>
            {connectedApps.map((a, i) => (
              <div
                key={a.id}
                className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${
                  i < connectedApps.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted" aria-hidden>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{a.appName}</div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {a.orgName} · connected {fmt(a.createdAt)} · last used {fmt(a.lastUsedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRevokeTarget(a)}
                  className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-terra/10 hover:text-terra"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Tools reference (collapsible) ────────────────────── */}
      <details
        id="tools"
        className="group scroll-mt-4 rounded-2xl border border-line bg-surface px-5 shadow-sm [&_summary::-webkit-details-marker]:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 py-4 font-display text-[15px] font-semibold tracking-[-0.01em]">
          What can my agent call?
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-auto text-muted transition-transform group-open:rotate-180"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div className="grid gap-x-6 gap-y-2.5 border-t border-line pb-5 pt-4 sm:grid-cols-2">
          {MCP_TOOLS.map((t) => (
            <div key={t.name} className="flex items-baseline gap-2.5">
              <code className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-blue-ink">
                {t.name}
              </code>
              <span className="text-[12.5px] leading-snug text-muted">{t.desc}</span>
            </div>
          ))}
        </div>
      </details>
      </div>

      {/* Revoke confirmation */}
      <Modal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        labelledBy="revoke-title"
        size="md"
        panelClassName="border border-line bg-surface p-6 shadow-lg"
        panelStyle={{
          backgroundImage: [
            "radial-gradient(120% 100% at 0% 0%, #d14a3e33, transparent 60%)", // brand red, top-left
            "radial-gradient(110% 90% at 100% 100%, #e3a72c2b, transparent 58%)", // brand amber, bottom-right
          ].join(","),
        }}
      >
        <div className="text-center">
          <span
            className="mx-auto grid size-12 place-items-center rounded-full text-white"
            style={{ backgroundColor: "#d14a3e" }}
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m4.9 4.9 14.2 14.2" />
            </svg>
          </span>
          <h3 id="revoke-title" className="mt-4 font-display text-lg font-semibold tracking-[-0.01em]">
            Revoke {revokeTarget?.appName ?? "this app"}?
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
            {revokeTarget?.appName ?? "This app"} will immediately lose access to the{" "}
            <b className="text-ink">{revokeTarget?.orgName}</b> workspace. Any agent using this
            connection stops working until it's reconnected.
          </p>
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={() => setRevokeTarget(null)}
            className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            Cancel
          </button>
          <form action={revokeConnectedApp} onSubmit={() => setRevokeTarget(null)} className="flex-1">
            <input type="hidden" name="id" value={revokeTarget?.id ?? ""} />
            <SubmitButton
              pendingLabel="Revoking…"
              className="w-full rounded-full bg-[#d14a3e] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition hover:bg-[#b83f34] hover:shadow-md disabled:opacity-60"
            >
              Revoke access
            </SubmitButton>
          </form>
        </div>
      </Modal>
    </div>
  );
}
