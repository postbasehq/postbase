"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { BlueskyForm } from "@/components/BlueskyForm";
import { DisconnectButton } from "@/components/DisconnectButton";
import { Modal } from "@/components/Modal";

type Account = {
  id: string;
  handle: string | null;
  status: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
};
type Kind = "oauth" | "bluesky" | "mastodon";

/**
 * Supported publishing platforms, in display order. Labels + logos come from
 * BrandTile's BRANDS map. Facebook is intentionally omitted: Page publishing is
 * built but parked behind Meta App Review.
 */
const PLATFORMS: { id: string; kind: Kind; desc: string; note?: string }[] = [
  { id: "x", kind: "oauth", desc: "Publish posts and threads to your X account." },
  {
    id: "instagram",
    kind: "oauth",
    desc: "Post to a Business or Creator account.",
    note: "Requires a Business/Creator account linked to a Facebook Page.",
  },
  { id: "linkedin", kind: "oauth", desc: "Publish posts to your LinkedIn profile." },
  {
    id: "tiktok",
    kind: "oauth",
    desc: "Post videos or photo carousels.",
    note: "Video and photo posts only — TikTok doesn’t allow text-only posts.",
  },
  {
    id: "youtube",
    kind: "oauth",
    desc: "Upload videos to your channel.",
    note: "Video uploads only.",
  },
  { id: "bluesky", kind: "bluesky", desc: "Connect with your handle and an app password." },
  { id: "mastodon", kind: "mastodon", desc: "Connect any instance — approve on your server." },
];

const TITLE_ID = "channel-connect-title";

// A representative accent per platform for the card's corner glow. X has no
// brand colour, so it gets a soft neutral; the rest use a colour that reads on
// both light and dark surfaces.
const GLOW: Record<string, string> = {
  x: "#8a9099",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  instagram: "#E1306C",
  tiktok: "#FE2C55",
  youtube: "#FF0000",
  bluesky: "#0085FF",
  mastodon: "#6364FF",
};

// Feed the brand accent to the card's glow (drawn/animated in CSS).
function cardGlow(platform: string): React.CSSProperties {
  const c = GLOW[platform];
  return c ? ({ "--glow": c } as React.CSSProperties) : {};
}

function StatusPill({ status }: { status: string }) {
  // Connected reads as a quiet dot + label (not a loud filled badge); any other
  // status keeps a bordered pill so it stands out as needing attention.
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green">
        <span className="size-1.5 rounded-full bg-green" />
        Connected
      </span>
    );
  }
  return (
    <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-muted">
      {status === "stub" ? "Stub" : status}
    </span>
  );
}

// Small verified check, matching the composer preview badge.
function VerifiedTick() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-blue" aria-label="Verified">
      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-4.86 1.42 1.41-6.15 6.35z" />
    </svg>
  );
}

export function ChannelsBoard({
  accountsByPlatform,
  disconnectAction,
}: {
  accountsByPlatform: Record<string, Account[]>;
  disconnectAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [instance, setInstance] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "connected" | "available">("all");

  const current = PLATFORMS.find((p) => p.id === active) ?? null;
  const totalConnected = Object.values(accountsByPlatform).reduce(
    (n, accts) => n + accts.length,
    0,
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? PLATFORMS.filter((p) => (BRANDS[p.id]?.label ?? p.id).toLowerCase().includes(q))
    : PLATFORMS;

  function close() {
    setActive(null);
    setInstance("");
  }

  function goMastodon() {
    const v = instance.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (v) window.location.href = `/api/connect/mastodon?instance=${encodeURIComponent(v)}`;
  }

  // Split so connected and unconnected cards never share a grid row (their
  // heights differ, which otherwise leaves stretched cards with dead space).
  const connectedPlatforms = filtered.filter((p) => (accountsByPlatform[p.id]?.length ?? 0) > 0);
  const availablePlatforms = filtered.filter((p) => (accountsByPlatform[p.id]?.length ?? 0) === 0);

  const renderCard = (p: (typeof PLATFORMS)[number]) => {
    const brand = BRANDS[p.id];
    const accounts = accountsByPlatform[p.id] ?? [];
    const connected = accounts.length > 0;
    return (
      <div
        key={p.id}
        style={cardGlow(p.id)}
        className="channel-card flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm"
      >
        <div className="flex items-start gap-3.5">
          <BrandTile platform={p.id} size={44} radius={11} />
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold tracking-[-0.01em]">
              {brand?.label ?? p.id}
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{p.desc}</p>
          </div>
          {connected ? (
            <span className="ml-auto shrink-0">
              <StatusPill status="active" />
            </span>
          ) : null}
        </div>

        {connected ? (
          <div className="mt-4 flex flex-col gap-2">
            {accounts.map((a) => {
              const primary = a.displayName || a.handle || "Connected account";
              const secondary = a.displayName && a.handle ? a.handle : null;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-line/70 bg-surface-2/50 px-2.5 py-2"
                >
                  {a.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatarUrl}
                      alt=""
                      className="size-9 shrink-0 rounded-full object-cover ring-1 ring-line"
                    />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-line">
                      <BrandTile platform={p.id} size={24} radius={12} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[13px] font-semibold text-ink">{primary}</span>
                      {a.verified ? <VerifiedTick /> : null}
                      {a.status !== "active" ? (
                        <span className="ml-1">
                          <StatusPill status={a.status} />
                        </span>
                      ) : null}
                    </div>
                    {secondary ? (
                      <div className="truncate text-xs text-muted">{secondary}</div>
                    ) : null}
                  </div>
                  <DisconnectButton
                    action={disconnectAction}
                    channelId={a.id}
                    label={`${brand?.label ?? p.id}${a.handle ? ` (${a.handle})` : ""}`}
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-4 flex pt-1">
          <button
            type="button"
            onClick={() => setActive(p.id)}
            className={
              connected
                ? "ml-auto rounded-full border border-line px-4 py-2 text-sm font-semibold text-blue-ink transition-colors hover:bg-surface-2"
                : "ml-auto rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
            }
          >
            {connected ? "Add another" : `Connect ${brand?.label ?? ""}`.trim()}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 focus-within:border-blue">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-muted"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels…"
            aria-label="Search channels"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
          />
        </div>

        <div
          role="group"
          aria-label="Filter channels"
          className="flex shrink-0 items-center gap-1 self-stretch rounded-full border border-line p-1"
        >
          {(["all", "connected", "available"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === f ? "bg-blue text-on-blue shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {totalConnected === 0 && !q ? (
        <div className="mb-5 flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-10 text-center shadow-sm">
          <div className="flex -space-x-2.5">
            {["x", "instagram", "linkedin", "tiktok", "youtube"].map((id) => (
              <span key={id} className="rounded-[13px] bg-surface p-[3px] shadow-sm">
                <BrandTile platform={id} size={40} radius={10} />
              </span>
            ))}
          </div>
          <h2 className="mt-5 font-display text-lg font-semibold tracking-[-0.01em]">
            Connect your first channel
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            You haven’t connected any accounts yet. Pick a platform below to publish your
            first post.
          </p>
        </div>
      ) : null}

      {(() => {
        const showConnected = filter !== "available" && connectedPlatforms.length > 0;
        const showAvailable = filter !== "connected" && availablePlatforms.length > 0;
        if (!showConnected && !showAvailable) {
          return (
            <p className="rounded-2xl border border-line bg-surface px-4 py-8 text-center text-sm text-muted">
              {q
                ? `No channels match “${query}”.`
                : filter === "connected"
                  ? "No connected channels yet."
                  : "No channels available to connect."}
            </p>
          );
        }
        return (
          <div className="flex flex-col gap-7">
            {showConnected ? (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Connected
                </h3>
                <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {connectedPlatforms.map(renderCard)}
                </div>
              </section>
            ) : null}
            {showAvailable ? (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  {connectedPlatforms.length > 0 ? "Available to connect" : "Connect a channel"}
                </h3>
                <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {availablePlatforms.map(renderCard)}
                </div>
              </section>
            ) : null}
          </div>
        );
      })()}

      <Modal open={active !== null} onClose={close} labelledBy={TITLE_ID}>
        {current ? (
          <>
            <div className="flex items-center gap-3.5">
              <BrandTile platform={current.id} size={46} radius={12} />
              <div className="min-w-0">
                <h3
                  id={TITLE_ID}
                  className="font-display text-lg font-semibold tracking-[-0.01em]"
                >
                  Connect {BRANDS[current.id]?.label ?? current.id}
                </h3>
                <p className="text-[13px] text-muted">
                  {current.kind === "oauth"
                    ? "Authorize Postbase to publish for you."
                    : current.desc}
                </p>
              </div>
            </div>

            {current.kind === "oauth" ? (
              <div className="mt-4">
                <p className="text-sm text-muted">
                  You’ll be sent to {BRANDS[current.id]?.label} to sign in and approve access.
                  Postbase only requests permission to publish posts — nothing else.
                </p>
                {current.note ? (
                  <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-3 text-[13px] text-muted">
                    {current.note}
                  </p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <a
                    href={`/api/connect/${current.id}`}
                    className="rounded-full bg-blue px-5 py-2 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
                  >
                    Continue to {BRANDS[current.id]?.label} →
                  </a>
                </div>
              </div>
            ) : null}

            {current.kind === "bluesky" ? (
              <div className="mt-4">
                <BlueskyForm
                  onConnected={() => {
                    close();
                    router.refresh();
                  }}
                  onCancel={close}
                />
              </div>
            ) : null}

            {current.kind === "mastodon" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  goMastodon();
                }}
                className="mt-4 flex flex-col gap-2"
              >
                <span className="text-[13px] font-medium text-muted">Your Mastodon server</span>
                <div className="flex items-center rounded-xl border border-line bg-ground px-3.5 focus-within:border-blue">
                  <span className="text-sm text-muted">https://</span>
                  <input
                    value={instance}
                    onChange={(e) => setInstance(e.target.value)}
                    autoFocus
                    spellCheck={false}
                    placeholder="mastodon.social"
                    className="min-w-0 flex-1 bg-transparent py-2.5 pl-1 text-sm outline-none"
                  />
                </div>
                <span className="text-xs text-muted">
                  You’ll approve access on your Mastodon server, then come back — no app to create.
                </span>
                <div className="mt-1 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-blue px-5 py-2 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
                  >
                    Continue →
                  </button>
                </div>
              </form>
            ) : null}
          </>
        ) : null}
      </Modal>
    </>
  );
}
