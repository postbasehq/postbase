/**
 * TikTok Content Posting API (Direct Post) + OAuth 2.0.
 *
 * TikTok is video/photo only — there are no text posts. Publishing is two steps:
 * initialize a post (TikTok pulls the media from a public URL) then poll status.
 *
 * PULL_FROM_URL requires the media URL's domain to be verified in the TikTok app,
 * so we serve media through our own domain (see /api/media/proxy) rather than the
 * Supabase storage domain, which can't be verified.
 *
 * Until the app passes TikTok's audit, posts are limited to SELF_ONLY (private)
 * visibility on the developer's own account.
 *
 * Requires TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_CALLBACK_URL
 * (+ optional TIKTOK_PRIVACY_LEVEL, default SELF_ONLY).
 */

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const API = "https://open.tiktokapis.com/v2";
const SCOPES = ["user.info.basic", "video.publish"];

export type TikTokTokens = {
  access_token: string;
  refresh_token?: string;
  open_id: string;
  scope?: string;
};

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

export function authorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    response_type: "code",
    scope: SCOPES.join(","),
    redirect_uri: process.env.TIKTOK_CALLBACK_URL!,
    state,
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

export function exchangeCode(code: string): Promise<TokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_CALLBACK_URL!,
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
): Promise<{ open_id: string; display_name?: string }> {
  const data = await tiktokJson<{ user?: { open_id: string; display_name?: string } }>(
    `${API}/user/info/?fields=open_id,display_name`,
    { method: "GET", headers: authHeaders(accessToken) },
  );
  if (!data.user) throw new Error("TikTok user info returned no user.");
  return { open_id: data.user.open_id, display_name: data.user.display_name };
}

/** Required before Direct Post — returns the privacy levels the creator can use. */
export async function creatorInfo(
  accessToken: string,
): Promise<{ privacy_level_options?: string[]; max_video_post_duration_sec?: number }> {
  return tiktokJson(`${API}/post/publish/creator_info/query/`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

/** Initialize a Direct Post video from a public URL. Returns the publish id. */
export async function initVideoPost(
  accessToken: string,
  videoUrl: string,
  caption: string,
  privacyLevel: string,
): Promise<string> {
  const data = await tiktokJson<{ publish_id: string }>(`${API}/post/publish/video/init/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      post_info: {
        title: caption,
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
    }),
  });
  return data.publish_id;
}

/** Initialize a Direct Post photo carousel from public URLs. Returns the publish id. */
export async function initPhotoPost(
  accessToken: string,
  photoUrls: string[],
  caption: string,
  privacyLevel: string,
): Promise<string> {
  const data = await tiktokJson<{ publish_id: string }>(`${API}/post/publish/content/init/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      post_info: {
        title: caption,
        description: caption,
        privacy_level: privacyLevel,
        disable_comment: false,
        auto_add_music: true,
      },
      source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: photoUrls },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
  });
  return data.publish_id;
}

/** Poll a publish job until it completes. Returns the final status. */
export async function waitForPublish(
  accessToken: string,
  publishId: string,
  { tries = 20, delayMs = 3000 }: { tries?: number; delayMs?: number } = {},
): Promise<string> {
  for (let i = 0; i < tries; i++) {
    const data = await tiktokJson<{ status: string; fail_reason?: string }>(
      `${API}/post/publish/status/fetch/`,
      {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ publish_id: publishId }),
      },
    );
    if (data.status === "PUBLISH_COMPLETE") return data.status;
    if (data.status === "FAILED") {
      throw new Error(`TikTok publish failed: ${data.fail_reason ?? "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  // Still processing — TikTok will finish server-side; treat as accepted.
  return "PROCESSING";
}
