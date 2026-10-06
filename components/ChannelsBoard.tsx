"use client";

import { useState, useTransition } from "react";
import { EmptyState } from "@/components/EmptyState";
import { useRouter } from "next/navigation";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { BlueskyForm } from "@/components/BlueskyForm";
import { DisconnectButton } from "@/components/DisconnectButton";
import { Modal } from "@/components/Modal";
import { CANCEL_CLS, PRIMARY_CLS } from "@/components/dialog-buttons";
import { formatReconnectBy } from "@/lib/channel-health";
import { COMING_SOON, IN_DEVELOPMENT, LIMITED } from "@/lib/platforms/availability";

type Account = {
  id: string;
  handle: string | null;
  status: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
  /** "reconnect": the platform stopped accepting our access; "expiring": it will soon. */
  health?: "ok" | "reconnect" | "expiring";
  reason?: string | null;
  reconnectBy?: string | null;
  /** Scheduled or failed posts held up by this account. */
  waiting?: number;
};
type Kind = "oauth" | "bluesky" | "mastodon";

/**
 * Publishing platforms, in display order. Labels + logos come from BrandTile's
 * BRANDS map. Facebook is built but waits on Meta's app review (COMING_SOON);
 * Threads isn't built yet (IN_DEVELOPMENT), so it only takes sign-ups.
 */
// `short` is the card's one line; `desc` is the fuller line in the connect dialog.
const PLATFORMS: { id: string; kind: Kind; desc: string; short: string; note?: string; access?: string[] }[] = [
  { id: "x", kind: "oauth", desc: "Publish posts and threads to your X account.", short: "Posts and threads." },
  {
    id: "instagram",
    kind: "oauth",
    desc: "Post to a Business or Creator account.",
    short: "Business and Creator accounts.",
    note: "Requires a Business/Creator account linked to a Facebook Page.",
  },
  { id: "facebook", kind: "oauth", desc: "Publish posts to a Facebook Page you manage.", short: "Pages you manage." },
  { id: "threads", kind: "oauth", desc: "Publish posts and threads to your Threads profile.", short: "Posts and threads." },
  { id: "linkedin", kind: "oauth", desc: "Publish posts to your LinkedIn profile.", short: "Posts to your profile." },
  {
    id: "tiktok",
    kind: "oauth",
    desc: "Post videos or photo carousels.",
    short: "Videos and photo carousels.",
    note: "Video and photo posts only. TikTok doesn’t allow text-only posts.",
  },
  {
    id: "youtube",
    kind: "oauth",
    desc: "Upload videos to your channel.",
    short: "Videos and Shorts.",
    note: "Video uploads only.",
    access: ["Upload the videos you schedule", "Set thumbnails on those videos", "See your channel name and your videos’ stats"],
  },
  { id: "bluesky", kind: "bluesky", desc: "Connect with your handle and an app password.", short: "Handle and app password." },
  { id: "mastodon", kind: "mastodon", desc: "Connect any server and approve it there.", short: "Any server." },
];

const TITLE_ID = "channel-connect-title";

// The connect dialog's one line of context under the title.
const MODAL_LINE: Record<Kind, (label: string) => string> = {
  oauth: (label) => `You’ll sign in on ${label} and approve access.`,
  bluesky: () => "Uses an app password, never your main password.",
  mastodon: () => "Works with any Mastodon server.",
};
// What Postbase can do once connected, when a platform doesn't list its own.
const DEFAULT_ACCESS = ["Publish the posts you schedule", "Read their likes, replies and views"];


const RED = "#d14a3e";
const AMBER = "#e3a72c";

function StatusPill({ status }: { status: string }) {
  // Connected reads as a quiet dot + label (not a loud filled badge); any other
  // status keeps a bordered pill so it stands out as needing attention.
  if (status === "reconnect" || status === "expiring") {
    const color = status === "reconnect" ? RED : AMBER;
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color }}>
        <span className="size-1.5 rounded-full" style={{ background: color }} />
        {status === "reconnect" ? "Reconnect needed" : "Expires soon"}
      </span>
    );
  }
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
  waitlisted = [],
  waitlistAction,
  earlyAccess = false,
}: {
  accountsByPlatform: Record<string, Account[]>;
  /** Omitted for members: only owners and admins can disconnect. */
  disconnectAction?: (formData: FormData) => Promise<void>;
  /** Platforms this user asked to hear about when they open. */
  waitlisted?: string[];
  waitlistAction?: (platform: string, join: boolean) => Promise<void>;
  /** Meta app tester: platforms in review connect as normal. */
  earlyAccess?: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [instance, setInstance] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "connected" | "available">("all");
  // Optimistic waitlist state so the button flips the moment it's pressed.
  const [joined, setJoined] = useState<Set<string>>(() => new Set(waitlisted));
  const [, startTransition] = useTransition();

  function toggleNotify(platform: string) {
    const join = !joined.has(platform);
    setJoined((prev) => {
      const next = new Set(prev);
      if (join) next.add(platform);
      else next.delete(platform);
      return next;
    });
    startTransition(() => waitlistAction?.(platform, join));
  }

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

  // Small outlined action, the same for every state: one quiet button per card
  // instead of a wall of filled ones.
  const actionCls =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink";

  const renderCard = (p: (typeof PLATFORMS)[number]) => {
    const brand = BRANDS[p.id];
    const label = brand?.label ?? p.id;
    const accounts = accountsByPlatform[p.id] ?? [];
    const connected = accounts.length > 0;
    const building = IN_DEVELOPMENT[p.id];
    const comingSoon = building ?? (earlyAccess ? undefined : COMING_SOON[p.id]);
    const limited = LIMITED[p.id];
    const health = accounts.some((a) => a.health === "reconnect")
      ? "reconnect"
      : accounts.some((a) => a.health === "expiring")
        ? "expiring"
        : "active";

    // One status, said once. The long explanation is the badge's tooltip.
    const badge = connected
      ? null
      : building
        ? { text: "Coming soon", why: building }
        : comingSoon
          ? { text: "In review", why: comingSoon }
          : limited
            ? { text: "Private for now", why: limited }
            : null;

    return (
      <div key={p.id} className="flex flex-col rounded-[20px] border border-line bg-surface p-1.5 shadow-sm">
        {/* Zone 1: which network, and its state */}
        <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface-2 px-3.5 py-3">
          <BrandTile platform={p.id} size={36} radius={9} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">{label}</div>
            {connected ? (
              <div className="mt-0.5">
                <StatusPill status={health} />
              </div>
            ) : null}
          </div>
          {badge ? (
            <span
              title={badge.why}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted"
            >
              <span className="size-1.5 rounded-full" style={{ background: AMBER }} />
              {badge.text}
            </span>
          ) : connected ? (
            <button type="button" onClick={() => setActive(p.id)} className={actionCls}>
              Add account
            </button>
          ) : null}
        </div>

        {connected ? (
          <div className="flex flex-col px-1.5 pb-1 pt-1.5">
            {accounts.map((a, i) => {
              const primary = a.displayName || a.handle || "Connected account";
              const secondary = a.displayName && a.handle && a.handle !== a.displayName ? a.handle : null;
              const issue = a.health === "reconnect" || a.health === "expiring" ? a.health : null;
              return (
                <div key={a.id} className={i > 0 ? "border-t border-line" : ""}>
                  <div className="flex items-center gap-3 px-2 py-2.5">
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover ring-1 ring-line" />
                    ) : (
                      <span className="grid size-8 shrink-0 place-items-center">
                        <BrandTile platform={p.id} size={28} radius={14} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-[13px] font-semibold text-ink">{primary}</span>
                        {a.verified ? <VerifiedTick /> : null}
                        {a.status !== "active" && a.status !== "reconnect" ? (
                          <span className="ml-1">
                            <StatusPill status={a.status} />
                          </span>
                        ) : null}
                      </div>
                      {secondary ? <div className="truncate text-xs text-muted">{secondary}</div> : null}
                    </div>
                    {disconnectAction ? (
                      <DisconnectButton
                        action={disconnectAction}
                        channelId={a.id}
                        label={`${label}${a.handle ? ` (${a.handle})` : ""}`}
                        quiet
                      />
                    ) : null}
                  </div>
                  {issue ? (
                    <div className="mx-2 mb-2.5 flex flex-wrap items-end gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5" style={{ borderColor: issue === "reconnect" ? RED : AMBER }}>
                      <div className="min-w-0 flex-1 text-[12px] leading-snug">
                        <div className="font-semibold" style={{ color: issue === "reconnect" ? RED : "var(--ink)" }}>
                          {issue === "reconnect"
                            ? "Posts to this account can’t go out"
                            : `Reconnect by ${formatReconnectBy(a.reconnectBy!)}`}
                        </div>
                        <div className="mt-0.5 text-muted">
                          {issue === "reconnect"
                            ? a.reason
                            : "LinkedIn connections last 60 days. Reconnect before then to keep posting."}
                          {a.waiting ? ` ${a.waiting} ${a.waiting === 1 ? "post is" : "posts are"} waiting on it.` : ""}
                        </div>
                      </div>
                      {p.kind === "oauth" ? (
                        <a
                          href={`/api/connect/${p.id}`}
                          className="shrink-0 rounded-full bg-[#2b59d9] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
                        >
                          Reconnect
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActive(p.id)}
                          className="shrink-0 rounded-full bg-[#2b59d9] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
                        >
                          Reconnect
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          /* Zone 2: what it does, and the one thing you can do */
          <div className="flex flex-1 items-center gap-3 px-3 pb-2 pt-3">
            <div className="min-w-0 flex-1 text-[13px] leading-snug text-muted">
              <p>{p.short}</p>
              {limited && waitlistAction ? (
                <button
                  type="button"
                  onClick={() => toggleNotify(p.id)}
                  className="mt-0.5 text-[12px] font-semibold text-blue-ink underline decoration-line underline-offset-2 hover:decoration-current"
                >
                  {joined.has(p.id) ? "We’ll email you. Undo" : "Email me when posts can be public"}
                </button>
              ) : null}
            </div>
            {comingSoon ? (
              <button
                type="button"
                onClick={() => toggleNotify(p.id)}
                title={joined.has(p.id) ? "Stop the email" : comingSoon}
                className={joined.has(p.id) ? `${actionCls} text-muted` : actionCls}
              >
                {joined.has(p.id) ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    On the list
                  </>
                ) : (
                  "Notify me"
                )}
              </button>
            ) : (
              <button type="button" onClick={() => setActive(p.id)} className={actionCls}>
                Connect
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[12rem] max-w-md flex-1 basis-full items-center gap-2 rounded-xl border border-line bg-surface px-3.5 focus-within:border-blue sm:basis-auto">
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
            <div className="rounded-2xl border border-line bg-surface shadow-sm">
              {q ? (
                <EmptyState kind="search" title={`No channels match “${query}”`} body="Try another network name." compact />
              ) : filter === "connected" ? (
                <EmptyState
                  kind="channels"
                  title="No channels connected yet"
                  body="Connect X, LinkedIn, Bluesky and more. Each account takes about a minute."
                  primary={{ href: "/channels", label: "See all networks" }}
                  compact
                />
              ) : (
                <EmptyState kind="channels" title="Every network is connected" body="You've connected all the networks Postbase supports." compact />
              )}
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-7">
            {showConnected ? (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-muted">Connected</h3>
                {/* Each card as tall as its accounts: no stretched dead space. */}
                <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {connectedPlatforms.map(renderCard)}
                </div>
              </section>
            ) : null}
            {showAvailable ? (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-muted">
                  {connectedPlatforms.length > 0 ? "Available to connect" : "Connect a channel"}
                </h3>
                {/* Every row the same height: these cards only differ by a line of text. */}
                <div className="grid auto-rows-fr grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {availablePlatforms.map(renderCard)}
                </div>
              </section>
            ) : null}
          </div>
        );
      })()}

      <Modal
        open={active !== null}
        onClose={close}
        labelledBy={TITLE_ID}
        panelClassName="border border-line bg-surface p-1.5 shadow-lg"
      >
        {current ? (
          <>
            {/* Zone 1: which network, in one line of context */}
            <div className="flex items-center gap-3.5 rounded-[14px] border border-line bg-surface-2 px-4 py-3.5">
              <BrandTile platform={current.id} size={40} radius={10} />
              <div className="min-w-0">
                <h3 id={TITLE_ID} className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
                  Connect {BRANDS[current.id]?.label ?? current.id}
                </h3>
                <p className="text-[13px] text-muted">{MODAL_LINE[current.kind](BRANDS[current.id]?.label ?? current.id)}</p>
              </div>
            </div>

            <div className="px-3.5 pb-3 pt-4">
              {current.kind === "oauth" ? (
                <>
                  <div className="text-[13px] font-semibold text-ink">Postbase will be able to</div>
                  <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-muted">
                    {(current.access ?? DEFAULT_ACCESS).map((a) => (
                      <li key={a} className="flex items-start gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2b59d9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0" aria-hidden>
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        {a}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 pl-[22px] text-[13px] text-muted">Nothing else, and you can disconnect any time.</p>
                  {/* Anything worth knowing first, as plain lines under a hairline. */}
                  {current.note || LIMITED[current.id] ? (
                    <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3.5 text-[13px] text-muted">
                      {[current.note, LIMITED[current.id]].filter(Boolean).map((n) => (
                        <li key={n} className="flex items-start gap-2">
                          <span className="mt-[7px] size-1.5 shrink-0 rounded-full" style={{ background: AMBER }} />
                          {n}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button type="button" onClick={close} className={CANCEL_CLS}>
                      Cancel
                    </button>
                    <a href={`/api/connect/${current.id}`} className={PRIMARY_CLS}>
                      Continue to {BRANDS[current.id]?.label}
                    </a>
                  </div>
                </>
              ) : null}

              {current.kind === "bluesky" ? (
                <BlueskyForm
                  onConnected={() => {
                    close();
                    router.refresh();
                  }}
                  onCancel={close}
                />
              ) : null}

              {current.kind === "mastodon" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    goMastodon();
                  }}
                  className="flex flex-col"
                >
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-ink">Your server</span>
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
                  </label>
                  <p className="mt-2 text-[13px] text-muted">You’ll approve access on your server, then come straight back.</p>
                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button type="button" onClick={close} className={CANCEL_CLS}>
                      Cancel
                    </button>
                    <button type="submit" disabled={!instance.trim()} className={PRIMARY_CLS}>
                      Continue
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
