"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/components/Modal";
import { BrandTile } from "@/components/BrandTile";
import { APP_CATEGORIES, APPS, type AppCategory } from "@/lib/postbots/apps-catalog";

type Connection = { slug: string; status: string };
type State = { loading: boolean; enabled: boolean; connections: Connection[]; error: string | null };

/**
 * "Connect apps": the sidebar button and its dialog. Lists the apps bots can
 * use (lib/postbots/apps-catalog.ts) and connects them through Composio's
 * sign-in, in a popup that reports back via /api/bots/apps/callback.
 */
export function ConnectApps() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ loading: true, enabled: true, connections: [], error: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AppCategory | "All">("All");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bots/apps", { cache: "no-store" });
      const data = (await res.json()) as { enabled?: boolean; connections?: Connection[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't load your apps.");
      setState({ loading: false, enabled: data.enabled !== false, connections: data.connections ?? [], error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : "Couldn't load your apps." }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The sign-in popup reports back here; coming back to the tab rechecks too.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || (e.data as { type?: string })?.type !== "postbots-app") return;
      setBusy(null);
      void load();
    };
    const onFocus = () => {
      setBusy(null);
      void load();
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const statusOf = (slug: string) => {
    const mine = state.connections.filter((c) => c.slug === slug);
    if (mine.some((c) => c.status === "ACTIVE")) return "connected";
    if (mine.some((c) => c.status === "INITIATED" || c.status === "INITIALIZING")) return "pending";
    return "none";
  };
  const connectedCount = new Set(state.connections.filter((c) => c.status === "ACTIVE").map((c) => c.slug)).size;

  async function connect(slug: string) {
    setBusy(slug);
    setState((s) => ({ ...s, error: null }));
    // Open the window now, while the click still counts, then point it at the link.
    const popup = window.open("", "postbots-connect", "width=520,height=720");
    try {
      const res = await fetch("/api/bots/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't start connecting.");
      if (popup && !popup.closed) popup.location.href = data.url;
      else window.location.href = data.url;
    } catch (e) {
      popup?.close();
      setBusy(null);
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Couldn't start connecting." }));
    }
  }

  async function disconnect(slug: string, name: string) {
    if (!confirm(`Disconnect ${name}? Your bots won't be able to use it until you connect it again.`)) return;
    setBusy(slug);
    try {
      const res = await fetch("/api/bots/apps", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't disconnect.");
      await load();
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Couldn't disconnect." }));
    } finally {
      setBusy(null);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      APPS.filter(
        (a) =>
          (category === "All" || a.category === category) &&
          (!q || a.name.toLowerCase().includes(q) || a.line.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)),
      ),
    [q, category],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] font-medium text-ink transition hover:bg-surface-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <path d="M17.5 14v7M14 17.5h7" />
        </svg>
        <span className="flex-1">Connect apps</span>
        {connectedCount ? <span className="text-[13px] text-muted">{connectedCount} connected</span> : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            // Above the phone drawer (z-70), which this can open from.
            <div className="relative z-[80]">
              <Modal open onClose={() => setOpen(false)} labelledBy="connect-apps-title" size="xl" panelClassName="border border-line bg-surface p-0 shadow-lg">
                <div className="sticky top-0 z-10 bg-surface px-5 pb-3 pt-5 md:px-7 md:pt-6">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 id="connect-apps-title" className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
                        Connect apps
                      </h2>
                      <p className="mt-1 text-[14px] text-muted">
                        Your bots can use these in chat. Connections are shared by everyone in this workspace.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close"
                      className="-mr-2 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-4 flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-blue">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden>
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search apps"
                      className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                    />
                  </div>
                  <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                    {(["All", ...APP_CATEGORIES] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                          category === c ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-line"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-5 pb-6 md:px-7">
                  {state.error ? (
                    <p className="mb-3 text-sm" style={{ color: "#d14a3e" }}>
                      {state.error}
                    </p>
                  ) : null}
                  {!state.enabled ? (
                    <p className="rounded-xl bg-surface-2 p-4 text-[14px] text-muted">Apps aren&apos;t switched on yet. They will be soon.</p>
                  ) : shown.length === 0 ? (
                    <p className="py-8 text-center text-[14px] text-muted">No apps match.</p>
                  ) : (
                    APP_CATEGORIES.filter((c) => shown.some((a) => a.category === c)).map((c) => (
                      <section key={c} className="mt-4 first:mt-1">
                        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted/70">{c}</h3>
                        <div className="grid gap-2 md:grid-cols-2">
                          {shown
                            .filter((a) => a.category === c)
                            .map((a) => {
                              const status = state.loading ? "loading" : statusOf(a.slug);
                              return (
                                <div key={a.slug} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                                  <BrandTile platform={a.slug} size={40} radius={10} />
                                  <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                                      {a.name}
                                      {status === "connected" ? (
                                        <span className="size-2 shrink-0 rounded-full" style={{ background: "#188038" }} aria-label="Connected" />
                                      ) : null}
                                    </p>
                                    <p className="truncate text-[13px] text-muted">{a.line}</p>
                                  </div>
                                  {status === "connected" ? (
                                    <button
                                      type="button"
                                      disabled={busy !== null}
                                      onClick={() => void disconnect(a.slug, a.name)}
                                      className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-muted transition hover:text-ink disabled:opacity-50"
                                    >
                                      {busy === a.slug ? "Disconnecting" : "Disconnect"}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={busy !== null || status === "loading"}
                                      onClick={() => void connect(a.slug)}
                                      className="shrink-0 rounded-full bg-blue px-3.5 py-1.5 text-[13px] font-semibold text-on-blue transition disabled:opacity-50"
                                    >
                                      {busy === a.slug ? "Connecting" : status === "pending" ? "Finish" : "Connect"}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </section>
                    ))
                  )}
                </div>
              </Modal>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
