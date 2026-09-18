"use client";

import { useActionState, useEffect, useState } from "react";
import { McpClientConfig } from "@/components/McpClientConfig";
import {
  createApiKey,
  rotateApiKey,
  revokeApiKey,
  type CreateKeyState,
} from "@/app/(app)/apikey-actions";

type KeyRow = {
  id: string;
  label: string | null;
  key_hint: string | null;
  created_at: string;
  last_used_at: string | null;
};

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
}: {
  keys: KeyRow[];
  brandfetchId?: string;
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

  return (
    <div className="flex flex-col gap-6">
      {/* ── API Key card ─────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
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
      <McpClientConfig apiKey={revealed} brandfetchId={brandfetchId} />

      {/* ── Tools reference ──────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">
            What your agent can do
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Once connected, ask it in plain language — e.g.{" "}
            <em>"Schedule this thread for 9am to X and LinkedIn."</em>
          </p>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-2">
          {MCP_TOOLS.map((t) => (
            <div key={t.name} className="bg-surface px-5 py-4">
              <code className="rounded-md bg-surface-2 px-2 py-1 font-mono text-[12.5px] font-semibold text-blue-ink">
                {t.name}
              </code>
              <p className="mt-2 text-[13px] text-muted">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
