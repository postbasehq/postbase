"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { BlueskyForm } from "@/components/BlueskyForm";
import { DisconnectButton } from "@/components/DisconnectButton";
import { Modal } from "@/components/Modal";

type Account = { id: string; handle: string | null; status: string };
type Kind = "oauth" | "bluesky" | "mastodon";

// Supported platforms, in display order (mirrors ChannelsBoard). Each icon in
// the bar is individually clickable and opens its own connect / manage modal.
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
  { id: "youtube", kind: "oauth", desc: "Upload videos to your channel.", note: "Video uploads only." },
  { id: "bluesky", kind: "bluesky", desc: "Connect with your handle and an app password." },
  { id: "mastodon", kind: "mastodon", desc: "Connect any instance — approve on your server." },
];

const TITLE_ID = "calendar-channel-title";

/**
 * Footer strip under the calendar: a "Manage channels" label on the left and a
 * fanned row of brand icons on the right. Each icon is its own button — clicking
 * one opens a modal to connect that platform (or manage the connection if it's
 * already linked). Connected platforms show in full colour; the rest are dimmed.
 */
export function CalendarChannelsBar({
  accountsByPlatform,
  disconnectAction,
}: {
  accountsByPlatform: Record<string, Account[]>;
  disconnectAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [instance, setInstance] = useState("");
  const n = PLATFORMS.length;

  const current = PLATFORMS.find((p) => p.id === active) ?? null;
  const accounts = current ? accountsByPlatform[current.id] ?? [] : [];
  const connected = accounts.length > 0;
  const brand = current ? BRANDS[current.id] : null;

  function close() {
    setActive(null);
    setInstance("");
  }

  function goMastodon() {
    const v = instance.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (v) window.location.href = `/api/connect/mastodon?instance=${encodeURIComponent(v)}`;
  }

  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-4">
        <span className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">
          Manage channels
        </span>

        <div className="flex items-center pl-2">
          {PLATFORMS.map((p, i) => {
            const isOn = (accountsByPlatform[p.id]?.length ?? 0) > 0;
            const angle = (i - (n - 1) / 2) * 6; // gentle fan
            const label = BRANDS[p.id]?.label ?? p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p.id)}
                aria-label={isOn ? `Manage ${label}` : `Connect ${label}`}
                title={isOn ? `Manage ${label}` : `Connect ${label}`}
                style={{ marginLeft: i === 0 ? 0 : -3, transform: `rotate(${angle}deg)`, zIndex: i }}
                className={`relative rounded-[9px] bg-surface p-[2.5px] shadow-sm ring-1 ring-line transition duration-150 hover:z-20 focus-visible:z-20 focus-visible:outline-none ${
                  isOn ? "" : "opacity-45 grayscale hover:opacity-100 hover:grayscale-0"
                }`}
              >
                <span className="block transition-transform duration-150 hover:-translate-y-1">
                  <BrandTile platform={p.id} size={26} radius={7} />
                </span>
              </button>
            );
          })}

          {/* add / manage channels */}
          <Link
            href="/channels"
            aria-label="Add or manage channels"
            title="Add channels"
            style={{ marginLeft: 6, zIndex: n }}
            className="relative flex size-[31px] items-center justify-center rounded-[9px] bg-surface text-blue-ink shadow-sm ring-1 ring-line transition-transform duration-150 hover:-translate-y-1 hover:ring-blue"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
      </div>

      <Modal open={active !== null} onClose={close} labelledBy={TITLE_ID}>
        {current ? (
          <>
            <div className="flex items-center gap-3.5">
              <BrandTile platform={current.id} size={46} radius={12} />
              <div className="min-w-0">
                <h3 id={TITLE_ID} className="font-display text-lg font-semibold tracking-[-0.01em]">
                  {connected ? `Manage ${brand?.label ?? current.id}` : `Connect ${brand?.label ?? current.id}`}
                </h3>
                <p className="text-[13px] text-muted">{current.desc}</p>
              </div>
            </div>

            {/* Connected accounts — manage / disconnect */}
            {connected ? (
              <div className="mt-4 flex flex-col gap-2">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {a.handle ?? "Connected account"}
                    </span>
                    {a.status !== "active" ? (
                      <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                        {a.status}
                      </span>
                    ) : null}
                    <DisconnectButton
                      action={disconnectAction}
                      channelId={a.id}
                      label={`${brand?.label ?? current.id}${a.handle ? ` (${a.handle})` : ""}`}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {/* Connect flow — OAuth link, or the Bluesky / Mastodon forms */}
            {current.kind === "oauth" ? (
              <div className="mt-4">
                {!connected ? (
                  <p className="text-sm text-muted">
                    You’ll be sent to {brand?.label} to sign in and approve access. Postbase only
                    requests permission to publish posts — nothing else.
                  </p>
                ) : null}
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
                    {connected ? "Done" : "Cancel"}
                  </button>
                  <a
                    href={`/api/connect/${current.id}`}
                    className="rounded-full bg-blue px-5 py-2 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
                  >
                    {connected ? "Add another →" : `Continue to ${brand?.label} →`}
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
                <span className="text-[13px] font-medium text-muted">
                  {connected ? "Connect another server" : "Your Mastodon server"}
                </span>
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
                    {connected ? "Done" : "Cancel"}
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
