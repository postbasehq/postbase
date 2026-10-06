import crypto from "node:crypto";
import { SendUnconfirmed, publishJson, sendPublish, unconfirmedMessage } from "@/lib/platforms/send-unconfirmed";
import { readTokenResponse } from "@/lib/platforms/token-error";

/**
 * X (Twitter) OAuth 2.0 (PKCE, confidential client) + posting helpers.
 * Requires X_CLIENT_ID, X_CLIENT_SECRET, X_CALLBACK_URL.
 */

const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const API = "https://api.twitter.com/2";
const MEDIA_UPLOAD_URL = "https://api.x.com/2/media/upload";
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access", "media.write"];

export type XTokens = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export function xConfigured(): boolean {
  return Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET && process.env.X_CALLBACK_URL);
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createPkce() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function authorizeUrl(state: string, challenge: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: process.env.X_CALLBACK_URL!,
    scope: SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${p.toString()}`;
}

function basicAuth(): string {
  const creds = `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`;
  return "Basic " + Buffer.from(creds).toString("base64");
}

/** Revoke an access token on X's side (used on disconnect). Best-effort. */
export async function revokeAccess(token: string): Promise<void> {
  await fetch("https://api.twitter.com/2/oauth2/revoke", {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token, token_type_hint: "access_token" }),
  });
}

async function tokenRequest(body: URLSearchParams): Promise<XTokens> {
  const res = await fetch(TOKEN_URL, {
    signal: AbortSignal.timeout(15_000), // well inside the 30s refresh lease (token-refresh.ts)
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return readTokenResponse<XTokens & { error?: string; error_description?: string }>(res, "X");
}

export function exchangeCode(code: string, verifier: string): Promise<XTokens> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.X_CALLBACK_URL!,
      code_verifier: verifier,
      client_id: process.env.X_CLIENT_ID!,
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<XTokens> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.X_CLIENT_ID!,
    }),
  );
}

export async function getMe(
  accessToken: string,
): Promise<{ id: string; username: string; name: string; avatar_url?: string; verified?: boolean }> {
  const res = await fetch(`${API}/users/me?user.fields=profile_image_url,verified,verified_type`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    data?: {
      id: string;
      username: string;
      name: string;
      profile_image_url?: string;
      verified?: boolean;
      verified_type?: string;
    };
    detail?: string;
  };
  if (!res.ok || !json.data) throw new Error(json.detail ?? `X users/me error ${res.status}`);
  // X returns a small "_normal" avatar; request the 400x400 variant instead.
  const avatar_url = json.data.profile_image_url?.replace("_normal.", "_400x400.");
  // Blue/Premium (and business/government) checks live in verified_type, not the
  // legacy `verified` boolean — treat any non-"none" type as verified.
  const verified =
    !!json.data.verified || (!!json.data.verified_type && json.data.verified_type !== "none");
  return { id: json.data.id, username: json.data.username, name: json.data.name, avatar_url, verified };
}

// X caps: one video (<=512MB) or up to 4 images per post.
export const X_MAX_IMAGES = 4;
export const X_MAX_VIDEO_BYTES = 512 * 1024 * 1024;
// 1MB APPEND segments — the size Postiz runs in production against X's limits.
const X_UPLOAD_CHUNK_SIZE = 1024 * 1024;
// How long to wait for X to transcode an uploaded video before giving up. Nothing
// is posted at upload time, so a timeout just fails the target for a later retry.
const X_PROCESSING_MAX_WAIT_MS = 100_000;

type ProcessingInfo = {
  state: string; // pending | in_progress | succeeded | failed
  check_after_secs?: number;
  error?: { message?: string };
};

type MediaResponse = {
  data?: { id?: string; processing_info?: ProcessingInfo };
  id?: string;
  media_id_string?: string;
  detail?: string;
  title?: string;
  errors?: { message?: string }[];
};

async function mediaRequest(accessToken: string, url: string, init: RequestInit = {}): Promise<MediaResponse> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const json = (text ? JSON.parse(text) : {}) as MediaResponse;
  if (!res.ok) {
    throw new Error(
      json.errors?.[0]?.message ?? json.detail ?? json.title ?? `X media upload error ${res.status}`,
    );
  }
  return json;
}

/** Upload an image via the v2 endpoint (one request). Returns a media id. Needs the media.write scope. */
export async function uploadMedia(
  accessToken: string,
  bytes: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  if (mimeType.startsWith("video/")) return uploadVideo(accessToken, bytes, mimeType);
  const form = new FormData();
  form.append("media", new Blob([bytes], { type: mimeType }));
  form.append("media_category", "tweet_image");
  const json = await mediaRequest(accessToken, MEDIA_UPLOAD_URL, { method: "POST", body: form });
  const id = json.data?.id ?? json.id ?? json.media_id_string;
  if (!id) throw new Error("X media upload returned no id.");
  return id;
}

/**
 * Upload a video with X's chunked v2 flow — initialize, append 1MB segments,
 * finalize — then wait for X to finish transcoding. The media id can't be
 * attached to a post until processing succeeds.
 */
export async function uploadVideo(accessToken: string, bytes: ArrayBuffer, mimeType: string): Promise<string> {
  const total = bytes.byteLength;
  if (total > X_MAX_VIDEO_BYTES) throw new Error("X videos must be under 512MB.");

  const init = await mediaRequest(accessToken, `${MEDIA_UPLOAD_URL}/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: mimeType || "video/mp4", total_bytes: total, media_category: "tweet_video" }),
  });
  const id = init.data?.id;
  if (!id) throw new Error("X video upload didn't return a media id.");

  const segments = Math.ceil(total / X_UPLOAD_CHUNK_SIZE);
  for (let i = 0; i < segments; i++) {
    const chunk = bytes.slice(i * X_UPLOAD_CHUNK_SIZE, Math.min((i + 1) * X_UPLOAD_CHUNK_SIZE, total));
    const form = new FormData();
    form.append("segment_index", String(i));
    form.append("media", new Blob([chunk], { type: "application/octet-stream" }));
    await mediaRequest(accessToken, `${MEDIA_UPLOAD_URL}/${id}/append`, { method: "POST", body: form });
  }

  const finalize = await mediaRequest(accessToken, `${MEDIA_UPLOAD_URL}/${id}/finalize`, { method: "POST" });
  let processing = finalize.data?.processing_info;

  // No processing_info means the media is ready; otherwise poll at X's pace.
  let waited = 0;
  while (processing && processing.state !== "succeeded") {
    if (processing.state === "failed") {
      throw new Error(`X couldn't process the video${processing.error?.message ? `: ${processing.error.message}` : "."}`);
    }
    if (waited >= X_PROCESSING_MAX_WAIT_MS) {
      throw new Error("X is still processing the video — it will be retried.");
    }
    const waitMs = Math.max(1, processing.check_after_secs ?? 2) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
    waited += waitMs;
    const status = await mediaRequest(
      accessToken,
      `${MEDIA_UPLOAD_URL}?command=STATUS&media_id=${encodeURIComponent(id)}`,
    );
    processing = status.data?.processing_info;
  }
  return id;
}

export async function postTweet(
  accessToken: string,
  text: string,
  inReplyToId?: string,
  mediaIds?: string[],
): Promise<{ id: string }> {
  const body: {
    text: string;
    reply?: { in_reply_to_tweet_id: string };
    media?: { media_ids: string[] };
  } = { text };
  if (inReplyToId) body.reply = { in_reply_to_tweet_id: inReplyToId };
  if (mediaIds && mediaIds.length) body.media = { media_ids: mediaIds };
  const res = await sendPublish(
    `${API}/tweets`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    "X",
  );
  const json = await publishJson<{ data?: { id: string }; detail?: string; title?: string }>(res, "X");
  if (res.ok && !json.data) throw new SendUnconfirmed(unconfirmedMessage("X"));
  if (!res.ok || !json.data) throw new Error(json.detail ?? json.title ?? `X post error ${res.status}`);
  return { id: json.data.id };
}

/** Public engagement metrics for a tweet (normalized). Note: X reads are metered. */
export async function getTweetMetrics(
  accessToken: string,
  tweetId: string,
): Promise<Record<string, number>> {
  const res = await fetch(`${API}/tweets/${tweetId}?tweet.fields=public_metrics`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    data?: {
      public_metrics?: {
        impression_count?: number;
        like_count?: number;
        reply_count?: number;
        retweet_count?: number;
        quote_count?: number;
        bookmark_count?: number;
      };
    };
    detail?: string;
  };
  const m = json.data?.public_metrics;
  if (!res.ok || !m) throw new Error(json.detail ?? `X metrics error ${res.status}`);
  return {
    impressions: m.impression_count ?? 0,
    likes: m.like_count ?? 0,
    comments: m.reply_count ?? 0,
    shares: (m.retweet_count ?? 0) + (m.quote_count ?? 0),
    saves: m.bookmark_count ?? 0,
  };
}

/**
 * Metrics for up to 100 tweets in one request (X bills per tweet returned, so
 * batching saves round trips, not money). Missing/deleted tweets are omitted.
 */
export async function getTweetsMetrics(
  accessToken: string,
  tweetIds: string[],
): Promise<Record<string, Record<string, number>>> {
  const out: Record<string, Record<string, number>> = {};
  for (let i = 0; i < tweetIds.length; i += 100) {
    const ids = tweetIds.slice(i, i + 100).join(",");
    const res = await fetch(`${API}/tweets?ids=${ids}&tweet.fields=public_metrics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json()) as {
      data?: { id: string; public_metrics?: Record<string, number | undefined> }[];
      detail?: string;
    };
    if (!res.ok) throw new Error(json.detail ?? `X metrics error ${res.status}`);
    for (const t of json.data ?? []) {
      const m = t.public_metrics ?? {};
      out[t.id] = {
        impressions: m.impression_count ?? 0,
        likes: m.like_count ?? 0,
        comments: m.reply_count ?? 0,
        shares: (m.retweet_count ?? 0) + (m.quote_count ?? 0),
        saves: m.bookmark_count ?? 0,
      };
    }
  }
  return out;
}

/** A thread that failed part-way: `ids` are the posts that did go out, in order. */
export class ThreadError extends Error {
  constructor(
    message: string,
    readonly ids: string[],
    /** The failing part may have gone out (SendUnconfirmed). */
    readonly unconfirmed = false,
  ) {
    super(message);
  }
}

/**
 * Post a thread as a reply chain; media (if any) attaches to the first tweet.
 * `resumeIds` are posts already sent by an earlier attempt: the thread carries
 * on after them instead of starting over (which would duplicate them on X).
 * `onPosted` sees the ids so far after every post, so progress survives a crash.
 */
export async function postThread(
  accessToken: string,
  texts: string[],
  mediaIds?: string[],
  opts: { resumeIds?: string[]; onPosted?: (ids: string[]) => Promise<void> } = {},
): Promise<{ id: string }> {
  const ids = [...(opts.resumeIds ?? [])].slice(0, texts.length);
  for (let i = ids.length; i < texts.length; i++) {
    try {
      const { id } = await postTweet(accessToken, texts[i], ids[i - 1], i === 0 ? mediaIds : undefined);
      ids.push(id);
    } catch (e) {
      throw new ThreadError(e instanceof Error ? e.message : "X post failed.", ids, e instanceof SendUnconfirmed);
    }
    await opts.onPosted?.([...ids]);
  }
  return { id: ids[0] };
}
