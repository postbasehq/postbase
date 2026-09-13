import crypto from "node:crypto";

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

async function tokenRequest(body: URLSearchParams): Promise<XTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as XTokens & { error?: string; error_description?: string };
  if (!res.ok) throw new Error(json.error_description ?? json.error ?? `X token error ${res.status}`);
  return json;
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

export async function getMe(accessToken: string): Promise<{ id: string; username: string; name: string }> {
  const res = await fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as { data?: { id: string; username: string; name: string }; detail?: string };
  if (!res.ok || !json.data) throw new Error(json.detail ?? `X users/me error ${res.status}`);
  return json.data;
}

/** Upload media (image/video bytes) via the v2 endpoint. Returns a media id. Needs the media.write scope. */
export async function uploadMedia(
  accessToken: string,
  bytes: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const category = mimeType.startsWith("video/") ? "tweet_video" : "tweet_image";
  const form = new FormData();
  form.append("media", new Blob([bytes], { type: mimeType }));
  form.append("media_category", category);
  const res = await fetch(MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const json = (await res.json()) as {
    data?: { id?: string };
    id?: string;
    media_id_string?: string;
    detail?: string;
    title?: string;
  };
  const id = json.data?.id ?? json.id ?? json.media_id_string;
  if (!res.ok || !id) throw new Error(json.detail ?? json.title ?? `X media upload error ${res.status}`);
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
  const res = await fetch(`${API}/tweets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { data?: { id: string }; detail?: string; title?: string };
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

/** Post a thread as a reply chain; media (if any) attaches to the first tweet. */
export async function postThread(
  accessToken: string,
  texts: string[],
  mediaIds?: string[],
): Promise<{ id: string }> {
  let firstId = "";
  let prevId: string | undefined;
  for (let i = 0; i < texts.length; i++) {
    const { id } = await postTweet(accessToken, texts[i], prevId, i === 0 ? mediaIds : undefined);
    if (!firstId) firstId = id;
    prevId = id;
  }
  return { id: firstId };
}
