/**
 * YouTube (Google OAuth 2.0) + Data API v3 video upload.
 *
 * YouTube is video-only — publishing uploads a video with a title/description.
 * Unverified apps have uploads locked to PRIVATE and limited to test users until
 * the app passes Google's OAuth verification.
 *
 * Requires YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_CALLBACK_URL
 * (+ optional YOUTUBE_PRIVACY_STATUS, default "private").
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/youtube/v3";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

export type YouTubeTokens = {
  access_token: string;
  refresh_token?: string;
  channel_id?: string;
  channel_title?: string;
};

export function youtubeConfigured(): boolean {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID &&
      process.env.YOUTUBE_CLIENT_SECRET &&
      process.env.YOUTUBE_CALLBACK_URL,
  );
}

export function defaultPrivacyStatus(): string {
  return process.env.YOUTUBE_PRIVACY_STATUS ?? "private";
}

export function authorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: process.env.YOUTUBE_CALLBACK_URL!,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // get a refresh token
    prompt: "consent", // force refresh-token issue on reconnect
    include_granted_scopes: "true",
    state,
  });
  return `${AUTHORIZE_URL}?${p.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
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
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `Google token error ${res.status}`);
  }
  return json;
}

export function exchangeCode(code: string): Promise<TokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri: process.env.YOUTUBE_CALLBACK_URL!,
      grant_type: "authorization_code",
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  );
}

/** The authorized user's primary YouTube channel. */
export async function getChannel(
  accessToken: string,
): Promise<{ id: string; title: string }> {
  const res = await fetch(`${API}/channels?part=snippet&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    items?: { id: string; snippet?: { title?: string } }[];
    error?: { message?: string };
  };
  const ch = json.items?.[0];
  if (!res.ok || !ch) throw new Error(json.error?.message ?? "No YouTube channel found on this account.");
  return { id: ch.id, title: ch.snippet?.title ?? "YouTube" };
}

/** Upload a video (resumable, single PUT). Returns the video id. */
export async function uploadVideo(
  accessToken: string,
  bytes: ArrayBuffer,
  meta: { title: string; description: string; privacy: string; mimeType?: string },
): Promise<string> {
  const mime = meta.mimeType || "video/*";
  const init = await fetch(`${UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mime,
      "X-Upload-Content-Length": String(bytes.byteLength),
    },
    body: JSON.stringify({
      snippet: { title: meta.title, description: meta.description },
      status: { privacyStatus: meta.privacy, selfDeclaredMadeForKids: false },
    }),
  });
  if (!init.ok) {
    const err = (await init.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `YouTube upload init failed (${init.status})`);
  }
  const uploadUrl = init.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube didn’t return an upload URL.");

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mime, "Content-Length": String(bytes.byteLength) },
    body: bytes,
  });
  const json = (await put.json()) as { id?: string; error?: { message?: string } };
  if (!put.ok || !json.id) throw new Error(json.error?.message ?? `YouTube upload failed (${put.status})`);
  return json.id;
}

/** Public video statistics (normalized). */
export async function getVideoStats(
  accessToken: string,
  videoId: string,
): Promise<Record<string, number>> {
  const res = await fetch(`${API}/videos?part=statistics&id=${videoId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    items?: { statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }[];
    error?: { message?: string };
  };
  const s = json.items?.[0]?.statistics;
  if (!res.ok || !s) throw new Error(json.error?.message ?? "YouTube stats unavailable.");
  return {
    impressions: Number(s.viewCount ?? 0),
    likes: Number(s.likeCount ?? 0),
    comments: Number(s.commentCount ?? 0),
  };
}
