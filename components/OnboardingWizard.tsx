"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { completeOnboarding } from "@/app/(app)/onboarding-actions";
import { createApiKey } from "@/app/(app)/apikey-actions";

const PLATFORMS = ["x", "linkedin", "instagram", "tiktok", "youtube"] as const;

const STEPS = [
  { n: 1, label: "Connect channels" },
  { n: 2, label: "Connect your agent" },
  { n: 3, label: "Get started" },
] as const;

export function OnboardingWizard({ connected: initial }: { connected: string[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [connected, setConnected] = useState<string[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/me/channels", { cache: "no-store" });
      if (r.ok) setConnected((await r.json()).platforms ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  // Open the platform OAuth in a popup; when it lands back on our domain,
  // close it and re-read the connected list. Falls back to a full redirect
  // if the popup is blocked.
  const connect = useCallback(
    (platform: string) => {
      const w = window.open(
        `/api/connect/${platform}`,
        "pb_connect",
        "width=680,height=820,menubar=no,toolbar=no",
      );
      if (!w) {
        window.location.href = `/api/connect/${platform}`;
        return;
      }
      setBusy(platform);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        if (w.closed) {
          if (pollRef.current) clearInterval(pollRef.current);
          setBusy(null);
          await refresh();
          return;
        }
        try {
          if (w.location.pathname.startsWith("/channels")) {
            if (pollRef.current) clearInterval(pollRef.current);
            w.close();
            setBusy(null);
            await refresh();
          }
        } catch {
          /* cross-origin while on the provider — keep waiting */
        }
      }, 600);
    },
    [refresh],
  );

  useEffect(() => () => void (pollRef.current && clearInterval(pollRef.current)), []);

  // Esc dismisses (treated as "done" so it doesn't nag again).
  const finish = useCallback(
    async (href?: string) => {
      await completeOnboarding();
      if (href) router.push(href);
      else router.refresh();
    },
    [router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
        {/* close */}
        <button
          onClick={() => void finish()}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* stepper */}
        <div className="flex items-center justify-center gap-2 border-b border-line px-6 py-5 sm:gap-4">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-6 items-center justify-center rounded-full font-display text-xs font-semibold ${
                    step >= s.n ? "bg-blue text-on-blue" : "bg-surface-2 text-muted"
                  }`}
                >
                  {s.n}
                </span>
                <span
                  className={`hidden text-sm font-medium sm:inline ${
                    step >= s.n ? "text-ink" : "text-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 ? <span className="h-px w-6 bg-line sm:w-10" /> : null}
            </div>
          ))}
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-10">
          {step === 1 ? (
            <StepChannels connected={connected} busy={busy} onConnect={connect} />
          ) : step === 2 ? (
            <StepAgent />
          ) : (
            <StepFinish connectedCount={connected.length} />
          )}
        </div>

        {/* footer */}
        <div className="flex items-center gap-3 border-t border-line px-6 py-4 sm:px-10">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="rounded-full border border-line px-5 py-2.5 font-display text-sm font-semibold text-ink hover:bg-surface-2"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <div className="ml-auto">
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full bg-blue px-6 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
              >
                {step === 1 && connected.length === 0 ? "Skip for now →" : "Continue →"}
              </button>
            ) : (
              <button
                onClick={() => void finish()}
                className="rounded-full bg-green px-6 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
              >
                Get started ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepChannels({
  connected,
  busy,
  onConnect,
}: {
  connected: string[];
  busy: string | null;
  onConnect: (p: string) => void;
}) {
  return (
    <div>
      <h2 className="text-center font-display text-2xl font-semibold tracking-[-0.01em]">
        Connect your channels
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-center text-sm text-muted">
        Link the accounts you want to publish to. You can add more any time from Channels.
      </p>

      <div className="mx-auto mt-7 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
        {PLATFORMS.map((p) => {
          const isConnected = connected.includes(p);
          const isBusy = busy === p;
          return (
            <button
              key={p}
              onClick={() => !isConnected && !isBusy && onConnect(p)}
              disabled={isConnected || isBusy}
              className={`group relative flex flex-col items-center gap-2.5 rounded-2xl border p-5 transition ${
                isConnected
                  ? "border-green/40 bg-green/[0.06]"
                  : "border-line bg-surface hover:border-blue hover:shadow-sm"
              }`}
            >
              <BrandTile platform={p} size={52} />
              <span className="font-display text-sm font-semibold">{BRANDS[p].label}</span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Connected
                </span>
              ) : isBusy ? (
                <span className="text-xs text-muted">Connecting…</span>
              ) : (
                <span className="text-xs text-muted group-hover:text-blue-ink">Connect</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepAgent() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("label", "AI agent");
      const res = await createApiKey({}, fd);
      if (res.key) setApiKey(res.key);
      else setError(res.error ?? "Couldn’t generate a key.");
    } finally {
      setPending(false);
    }
  }

  const config = `{
  "mcpServers": {
    "postbase": {
      "command": "npx",
      "args": ["@postbasehq/mcp"],
      "env": { "POSTBASE_API_KEY": "${apiKey ?? "pb_live_…"}" }
    }
  }
}`;

  return (
    <div>
      <h2 className="text-center font-display text-2xl font-semibold tracking-[-0.01em]">
        Connect your AI agent
      </h2>
      <p className="mx-auto mt-1.5 max-w-lg text-center text-sm text-muted">
        Postbase is MCP-native. Give Claude, Cursor, or any MCP client the Postbase tools and
        it can draft, schedule, and publish for you.
      </p>

      <div className="mx-auto mt-7 max-w-xl">
        <div className="flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-blue text-xs font-semibold text-on-blue">
            1
          </span>
          <span className="text-sm font-medium">Generate an API key</span>
          {!apiKey ? (
            <button
              onClick={generate}
              disabled={pending}
              className="ml-auto rounded-full bg-blue px-4 py-2 font-display text-xs font-semibold text-on-blue shadow-sm disabled:opacity-60"
            >
              {pending ? "Generating…" : "Generate key"}
            </button>
          ) : (
            <span className="ml-auto text-xs font-medium text-green">Key created ✓</span>
          )}
        </div>
        {error ? <p className="mt-2 pl-9 text-xs text-terra">{error}</p> : null}
        {apiKey ? (
          <div className="mt-3 rounded-xl border border-blue bg-blue-soft p-3">
            <p className="text-xs font-semibold text-blue-ink">
              Copy it now — you won’t see it again.
            </p>
            <code className="mt-1.5 block overflow-x-auto rounded-lg bg-surface px-3 py-2 font-mono text-[13px]">
              {apiKey}
            </code>
          </div>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-blue text-xs font-semibold text-on-blue">
            2
          </span>
          <span className="text-sm font-medium">Add Postbase to your MCP client config</span>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#1b1e26] p-5 font-mono text-[12.5px] leading-6 text-[#e6e8ef] shadow-sm">
          {config}
        </pre>
        <p className="mt-3 text-sm text-muted">
          Then just ask: <em>“Schedule this thread for 9am to X and LinkedIn.”</em>
        </p>
      </div>
    </div>
  );
}

function StepFinish({ connectedCount }: { connectedCount: number }) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-green/12">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-green,#188038)" strokeWidth="2.5">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.01em]">
        You’re all set
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
        {connectedCount > 0
          ? `${connectedCount} channel${connectedCount === 1 ? "" : "s"} connected. Write your first post and Postbase will publish it on schedule.`
          : "Connect a channel whenever you’re ready, then write your first post and Postbase will publish it on schedule."}
      </p>
    </div>
  );
}
