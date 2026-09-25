/**
 * TikTok Content Posting API (Direct Post) + OAuth 2.0.
 *
 * TikTok is video/photo only — there are no text posts. Publishing is two steps:
 * initialize a post, provide the media, then poll status.
 *
 * Video uses FILE_UPLOAD (we upload the bytes directly), which needs no domain
 * verification. Photos use PULL_FROM_URL, which requires the media URL's domain
 * to be verified in the TikTok app — so photos are served through our own domain
 * (see /api/media/proxy), not the Supabase domain, which can't be verified.
 *
 * The app passed TikTok's Content Posting API audit (Sept 2026), so posts use the
 * visibility the creator picks in the composer (clamped to their creator_info).
 *
 * Requires TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_CALLBACK_URL.
 * TIKTOK_PRIVACY_LEVEL is an optional hard cap (e.g. SELF_ONLY for a sandbox
 * app); leave it unset in production.
 */

import crypto from "node:crypto";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const API = "https://open.tiktokapis.com/v2";
// video.list is needed to read post metrics (analytics). Existing connections
// must reconnect to grant it.
const SCOPES = ["user.info.basic", "video.publish", "video.list"];

/**
 * TikTok OAuth requires PKCE. Note: TikTok uses a **hex-encoded** SHA-256 of the
 * verifier for the challenge (not base64url like standard PKCE).
 */
export function createPkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("hex"); // 64 hex chars (valid 43–128)
  const challenge = crypto.createHash("sha256").update(verifier).digest("hex");
  return { verifier, challenge };
}

export type TikTokTokens = {
  access_token: string;
  refresh_token?: string;
  open_id: string;
  scope?: string;
};

/** Per-post Direct Post options (interaction + commercial disclosure). */
export type TikTokPostOptions = {
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  brandOrganic?: boolean; // "Your brand" → brand_organic_toggle
  brandedContent?: boolean; // "Branded content" → brand_content_toggle
};

function commercialFlags(o?: TikTokPostOptions) {
  return {
    brand_content_toggle: o?.brandedContent ?? false,
    brand_organic_toggle: o?.brandOrganic ?? false,
  };
}

export function tiktokConfigured(): boolean {
  return Boolean(
    process.env.TIKTOK_CLIENT_KEY &&
      process.env.TIKTOK_CLIENT_SECRET &&
      process.env.TIKTOK_CALLBACK_URL,
  );
}

export function defaultPrivacyLevel(): string {
  return process.env.TIKTOK_PRIVACY_LEVEL ?? "SELF_ONLY";
}

/**
 * Revoke the app's access for this token on TikTok's side. Called on disconnect
 * so removing a channel truly de-authorizes Postbase (and a later reconnect
 * shows the consent screen again). Best-effort — callers ignore failures.
 */
export async function revokeAccess(accessToken: string): Promise<void> {
  await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
      token: accessToken,
    }),
  });
}

export const TIKTOK_PRIVACY_LEVELS = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
] as const;

/**
 * Choose the privacy level to post with: honor the user's preference when the
 * creator allows it, else fall back to SELF_ONLY (safe for unaudited apps), else
 * the first allowed option.
 */
export function pickPrivacyLevel(options: string[] | undefined, preferred: string): string {
  if (options && options.length > 0) {
    if (options.includes(preferred)) return preferred;
    if (options.includes("SELF_ONLY")) return "SELF_ONLY";
    return options[0];
  }
  return preferred;
}

export function authorizeUrl(state: string, challenge: string): string {
  const p = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    response_type: "code",
    scope: SCOPES.join(","),
    redirect_uri: process.env.TIKTOK_CALLBACK_URL!,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${p.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  open_id?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `TikTok token error ${res.status}`);
  }
  return json;
}

export function exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_CALLBACK_URL!,
      code_verifier: codeVerifier,
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=UTF-8",
  };
}

// TikTok wraps responses as { data, error: { code, message } }; code "ok" is success.
type TikTokEnvelope<T> = { data?: T; error?: { code?: string; message?: string } };

async function tiktokJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as TikTokEnvelope<T>;
  if (json.error && json.error.code && json.error.code !== "ok") {
    throw new Error(json.error.message ?? `TikTok error ${json.error.code}`);
  }
  if (!res.ok || !json.data) throw new Error(`TikTok request failed (${res.status}).`);
  return json.data;
}

export async function getUser(
  accessToken: string,
): Promise<{ open_id: string; display_name?: string; avatar_url?: string }> {
  const data = await tiktokJson<{ user?: { open_id: string; display_name?: string; avatar_url?: string } }>(
    `${API}/user/info/?fields=open_id,display_name,avatar_url`,
    { method: "GET", headers: authHeaders(accessToken) },
  );
  if (!data.user) throw new Error("TikTok user info returned no user.");
  return { open_id: data.user.open_id, display_name: data.user.display_name, avatar_url: data.user.avatar_url };
}

/** Required before Direct Post — returns the privacy levels the creator can use. */
export async function creatorInfo(
  accessToken: string,
): Promise<{
  creator_nickname?: string;
  creator_username?: string;
  creator_avatar_url?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
}> {
  return tiktokJson(`${API}/post/publish/creator_info/query/`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

// TikTok single-chunk FILE_UPLOAD accepts a whole video up to 64MB in one PUT.
export const TIKTOK_MAX_SINGLE_CHUNK = 64 * 1024 * 1024;

/**
 * Initialize a Direct Post video via FILE_UPLOAD (we upload the bytes directly,
 * so no domain verification is needed). Returns the publish id + the upload URL.
 */
export async function initVideoUpload(
  accessToken: string,
  caption: string,
  privacyLevel: string,
  videoSize: number,
  options?: TikTokPostOptions,
): Promise<{ publishId: string; uploadUrl: string }> {
  const data = await tiktokJson<{ publish_id: string; upload_url: string }>(
    `${API}/post/publish/video/init/`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: privacyLevel,
          disable_duet: options?.disableDuet ?? false,
          disable_comment: options?.disableComment ?? false,
          disable_stitch: options?.disableStitch ?? false,
          ...commercialFlags(options),
        },
        // Single chunk: the whole file in one PUT.
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoSize,
          chunk_size: videoSize,
          total_chunk_count: 1,
        },
      }),
    },
  );
  return { publishId: data.publish_id, uploadUrl: data.upload_url };
}

/** Upload the whole video to the init'd upload URL as a single chunk. */
export async function uploadVideoFile(
  uploadUrl: string,
  bytes: ArrayBuffer,
  mimeType = "video/mp4",
): Promise<void> {
  const size = bytes.byteLength;
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(size),
      "Content-Range": `bytes 0-${size - 1}/${size}`,
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`TikTok video upload failed (${res.status}).`);
}

/** Initialize a Direct Post photo carousel from public URLs. Returns the publish id. */
export async function initPhotoPost(
  accessToken: string,
  photoUrls: string[],
  caption: string,
  privacyLevel: string,
  options?: TikTokPostOptions,
): Promise<string> {
  const data = await tiktokJson<{ publish_id: string }>(`${API}/post/publish/content/init/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      post_info: {
        title: caption,
        description: caption,
        privacy_level: privacyLevel,
        disable_comment: options?.disableComment ?? false,
        auto_add_music: true,
        ...commercialFlags(options),
      },
      source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: photoUrls },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
  });
  return data.publish_id;
}

/**
 * Poll a publish job until it completes. Returns the final status and, when
 * available, the published post id (used later to read metrics).
 */
export async function waitForPublish(
  accessToken: string,
  publishId: string,
  { tries = 20, delayMs = 3000 }: { tries?: number; delayMs?: number } = {},
): Promise<{ status: string; postId?: string }> {
  for (let i = 0; i < tries; i++) {
    const data = await tiktokJson<{
      status: string;
      fail_reason?: string;
      publicaly_available_post_id?: string[];
    }>(`${API}/post/publish/status/fetch/`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ publish_id: publishId }),
    });
    if (data.status === "PUBLISH_COMPLETE") {
      return { status: data.status, postId: data.publicaly_available_post_id?.[0] };
    }
    if (data.status === "FAILED") {
      throw new Error(`TikTok publish failed: ${data.fail_reason ?? "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  // Still processing — TikTok will finish server-side; treat as accepted.
  return { status: "PROCESSING" };
}

/** Video metrics (normalized) via the video query API. Needs the video.list scope. */
export async function getVideoMetrics(
  accessToken: string,
  videoId: string,
): Promise<Record<string, number>> {
  const data = await tiktokJson<{
    videos?: { like_count?: number; comment_count?: number; share_count?: number; view_count?: number }[];
  }>(`${API}/video/query/?fields=like_count,comment_count,share_count,view_count`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ filters: { video_ids: [videoId] } }),
  });
  const v = data.videos?.[0];
  if (!v) throw new Error("No TikTok video metrics returned.");
  return {
    impressions: v.view_count ?? 0,
    likes: v.like_count ?? 0,
    comments: v.comment_count ?? 0,
    shares: v.share_count ?? 0,
  };
}
