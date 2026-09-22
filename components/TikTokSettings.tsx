"use client";

import { useEffect, useRef, useState } from "react";

/**
 * TikTok Direct Post settings, built to TikTok's Content Sharing Guidelines
 * (required to pass the Content Posting API audit):
 *  - privacy options come from the creator_info API (not hardcoded), nothing
 *    defaults to a public option;
 *  - interaction toggles (comment / duet / stitch) reflect the creator's own
 *    settings and disable what they've turned off;
 *  - a commercial-content disclosure (Your brand / Branded content) with the
 *    required consent text, and branded content can't be private;
 *  - the Music Usage Confirmation declaration.
 * It renders the hidden form fields the composer submits, and reports validity
 * up so the post can't be scheduled until the required choices are made.
 */

export type TikTokInitial = {
  privacy?: string;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  brandOrganic?: boolean;
  brandedContent?: boolean;
};

type CreatorInfo = {
  nickname: string | null;
  username: string | null;
  avatarUrl: string | null;
  privacyOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxDurationSec: number | null;
};

const PRIVACY_LABEL: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

const MUSIC_URL = "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en";
const BC_POLICY_URL = "https://www.tiktok.com/legal/page/global/bc-policy/en";

export function TikTokSettings({
  channelId,
  channelHandle,
  isPhoto,
  initial,
  onValidChange,
}: {
  channelId: string | null;
  channelHandle: string | null;
  isPhoto: boolean;
  initial?: TikTokInitial;
  onValidChange: (valid: boolean) => void;
}) {
  const [info, setInfo] = useState<CreatorInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [privacy, setPrivacy] = useState(initial?.privacy ?? "");
  const [allowComment, setAllowComment] = useState(!initial?.disableComment);
  const [allowDuet, setAllowDuet] = useState(!initial?.disableDuet);
  const [allowStitch, setAllowStitch] = useState(!initial?.disableStitch);
  const [disclose, setDisclose] = useState(
    Boolean(initial?.brandOrganic || initial?.brandedContent),
  );
  const [yourBrand, setYourBrand] = useState(Boolean(initial?.brandOrganic));
  const [brandedContent, setBrandedContent] = useState(Boolean(initial?.brandedContent));

  // Custom privacy dropdown (replaces the native select for a themed look).
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const privacyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!privacyOpen) return;
    const onDown = (e: MouseEvent) => {
      if (privacyRef.current && !privacyRef.current.contains(e.target as Node)) {
        setPrivacyOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPrivacyOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [privacyOpen]);

  // Fetch the creator's info for the selected TikTok account.
  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch("/api/tiktok/creator-info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel_id: channelId }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "failed");
        return r.json() as Promise<CreatorInfo>;
      })
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        // Force off (and lock) any interaction the creator has disabled.
        if (data.commentDisabled) setAllowComment(false);
        if (data.duetDisabled) setAllowDuet(false);
        if (data.stitchDisabled) setAllowStitch(false);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  // Branded content can't be private — drop SELF_ONLY as an option when it's on.
  const brandedPrivate = disclose && brandedContent && privacy === "SELF_ONLY";
  const discloseIncomplete = disclose && !yourBrand && !brandedContent;

  const valid = !channelId
    ? true
    : Boolean(info) && privacy !== "" && !discloseIncomplete && !brandedPrivate;

  useEffect(() => {
    onValidChange(valid);
  }, [valid, onValidChange]);

  // Branded content can't be private — clear a "Only me" selection so it truly
  // disappears and the user must pick a wider audience (matches TikTok's UI).
  useEffect(() => {
    if (disclose && brandedContent && privacy === "SELF_ONLY") setPrivacy("");
  }, [disclose, brandedContent, privacy]);

  if (!channelId) return null;

  const options = (info?.privacyOptions?.length ? info.privacyOptions : ["SELF_ONLY"]).filter(
    (o) => !(disclose && brandedContent && o === "SELF_ONLY"),
  );

  const check =
    "size-4 shrink-0 rounded border-line text-blue focus-visible:ring-blue disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3.5">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
        <span className="text-[13px] font-semibold">TikTok settings</span>
        {channelHandle ? <span className="text-xs text-muted">{channelHandle}</span> : null}
      </div>

      {loading ? (
        <p className="text-xs text-muted">Loading your TikTok account…</p>
      ) : loadError ? (
        <p className="text-xs text-terra">
          Couldn’t load your TikTok account. Reconnect TikTok in Channels and try again.
        </p>
      ) : (
        <>
          {info && (info.nickname || info.avatarUrl) ? (
            <div className="flex items-center gap-2.5">
              {info.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={info.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
              ) : null}
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{info.nickname}</div>
                {info.username ? (
                  <div className="truncate text-xs text-muted">@{info.username}</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Privacy — custom dropdown */}
          <div className="flex flex-col gap-1" ref={privacyRef}>
            <span className="text-xs font-medium text-muted">Who can view this post</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPrivacyOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={privacyOpen}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-ground px-3 py-2 text-left text-sm transition-colors ${
                  privacyOpen ? "border-blue" : "border-line hover:border-line/80"
                } ${privacy ? "text-ink" : "text-muted"}`}
              >
                <span>{privacy ? (PRIVACY_LABEL[privacy] ?? privacy) : "Select who can view…"}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 text-muted transition-transform ${privacyOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {privacyOpen ? (
                <ul
                  role="listbox"
                  className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg"
                >
                  {options.map((o) => {
                    const isSel = o === privacy;
                    return (
                      <li key={o}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSel}
                          onClick={() => {
                            setPrivacy(o);
                            setPrivacyOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2 ${
                            isSel ? "font-semibold text-ink" : "text-ink"
                          }`}
                        >
                          {PRIVACY_LABEL[o] ?? o}
                          {isSel ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-blue" aria-hidden>
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Interaction toggles */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Allow users to</span>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                className={check}
                checked={allowComment}
                disabled={info?.commentDisabled}
                onChange={(e) => setAllowComment(e.target.checked)}
              />
              Comment
              {info?.commentDisabled ? (
                <span className="text-xs text-muted">· off in your TikTok settings</span>
              ) : null}
            </label>
            {!isPhoto ? (
              <>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    className={check}
                    checked={allowDuet}
                    disabled={info?.duetDisabled}
                    onChange={(e) => setAllowDuet(e.target.checked)}
                  />
                  Duet
                  {info?.duetDisabled ? (
                    <span className="text-xs text-muted">· off in your TikTok settings</span>
                  ) : null}
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    className={check}
                    checked={allowStitch}
                    disabled={info?.stitchDisabled}
                    onChange={(e) => setAllowStitch(e.target.checked)}
                  />
                  Stitch
                  {info?.stitchDisabled ? (
                    <span className="text-xs text-muted">· off in your TikTok settings</span>
                  ) : null}
                </label>
              </>
            ) : null}
          </div>

          {/* Commercial content disclosure */}
          <div className="flex flex-col gap-2 border-t border-line pt-2.5">
            <label className="flex items-center justify-between gap-2 text-[13px] font-medium">
              <span>Disclose post content</span>
              <input
                type="checkbox"
                className={check}
                checked={disclose}
                onChange={(e) => {
                  setDisclose(e.target.checked);
                  if (!e.target.checked) {
                    setYourBrand(false);
                    setBrandedContent(false);
                  }
                }}
              />
            </label>
            <p className="text-xs text-muted">
              Turn on to declare that this post promotes a brand, product, or service.
            </p>
            {disclose ? (
              <div className="flex flex-col gap-1.5 pl-0.5">
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    className={check}
                    checked={yourBrand}
                    onChange={(e) => setYourBrand(e.target.checked)}
                  />
                  Your brand — promoting yourself or your own business
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    className={check}
                    checked={brandedContent}
                    onChange={(e) => setBrandedContent(e.target.checked)}
                  />
                  Branded content — promoting another brand (paid partnership)
                </label>
                {discloseIncomplete ? (
                  <p className="text-xs text-terra">
                    Select at least one: Your brand, Branded content, or both.
                  </p>
                ) : null}
                {brandedPrivate ? (
                  <p className="text-xs text-terra">
                    Branded content can’t be private — choose a wider audience.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Required consent / music confirmation */}
          <p className="text-[11px] leading-relaxed text-muted">
            By posting, you agree to TikTok’s{" "}
            {disclose && brandedContent ? (
              <>
                <a href={BC_POLICY_URL} target="_blank" rel="noreferrer" className="text-blue-ink underline">
                  Branded Content Policy
                </a>{" "}
                and{" "}
              </>
            ) : null}
            <a href={MUSIC_URL} target="_blank" rel="noreferrer" className="text-blue-ink underline">
              Music Usage Confirmation
            </a>
            .
          </p>
        </>
      )}

      {/* Hidden fields the composer submits */}
      <input type="hidden" name="tiktok_privacy_level" value={privacy} />
      <input type="hidden" name="tiktok_disable_comment" value={String(!allowComment)} />
      <input type="hidden" name="tiktok_disable_duet" value={String(!allowDuet)} />
      <input type="hidden" name="tiktok_disable_stitch" value={String(!allowStitch)} />
      <input type="hidden" name="tiktok_brand_organic" value={String(disclose && yourBrand)} />
      <input type="hidden" name="tiktok_branded_content" value={String(disclose && brandedContent)} />
    </div>
  );
}
