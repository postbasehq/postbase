import { randomUUID } from "node:crypto";
import { fetchMedia, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/platforms/fetch-media";
import { isPublicIp } from "@/lib/safe-fetch";

/**
 * Mastodon integration — raw REST over fetch (SDK-free, matching the codebase).
 *
 * Like Bluesky, auth is simple: the user creates an application in their
 * instance's Preferences → Development (scopes read + write), copies the access
 * token, and pastes it with their instance URL. No OAuth redirect, no review.
 * Mastodon is multi-instance, so we store the instance URL alongside the token.
 */

export const MASTODON_MAX_CHARS = 500; // default; some instances allow more

export type MastodonTokens = {
  instance: string; // e.g. https://mastodon.social
  access_token: string;
  account_id: string;
  handle: string; // @user@instance
  // The per-instance OAuth app this token was issued to: needed to revoke it
  // on disconnect. Missing on channels connected before it was stored.
  client_id?: string;
  client_secret?: string;
};

export type MastodonMedia = { url: string; type: string };

export function normalizeInstance(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

/**
 * Whether a Mastodon server address is safe for our servers to call: https, a
 * real public hostname, and every address it resolves to public. Mastodon is
 * federated, so the address is user-supplied: without this a "server" like
 * metadata.google.internal or 10.0.0.1.nip.io would point our requests inside
 * the hosting network (SSRF).
 */
export async function isPublicInstance(instanceUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(normalizeInstance(instanceUrl));
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || /\.(internal|local|localhost|lan|home|corp|intranet)$/.test(host)) return false;
  try {
    const { lookup } = await import("node:dns/promises");
    const addrs = await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => isPublicIp(a.address));
  } catch {
    return false;
  }
}

async function api<T>(
  instance: string,
  path: string,
  opts: {
    token: string;
    method?: string;
    body?: unknown;
    form?: FormData;
    headers?: Record<string, string>;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`,
    ...(opts.headers ?? {}),
  };
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${instance}${path}`, {
    method: opts.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((json.error as string) || `Mastodon ${path} failed (${res.status})`);
  }
  return json as T;
}

const OAUTH_SCOPES = "read write";

/** Fetch the account for a token → the fields we store. */
export async function verifyAccount(
  instanceUrl: string,
  token: string,
): Promise<{ instance: string; account_id: string; handle: string; display_name?: string; avatar_url?: string }> {
  const instance = normalizeInstance(instanceUrl);
  const account = await api<{ id: string; username: string; display_name?: string; avatar?: string }>(
    instance,
    "/api/v1/accounts/verify_credentials",
    { token: token.trim() },
  );
  return {
    instance,
    account_id: account.id,
    handle: `@${account.username}@${new URL(instance).host}`,
    display_name: account.display_name,
    avatar_url: account.avatar,
  };
}

/** Revoke the access token on its instance (best-effort; needs the app's credentials). */
export async function revokeAccess(tokens: MastodonTokens): Promise<void> {
  if (!tokens.client_id || !tokens.client_secret) return;
  if (!(await isPublicInstance(tokens.instance))) return;
  await fetch(`${normalizeInstance(tokens.instance)}/oauth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: tokens.client_id, client_secret: tokens.client_secret, token: tokens.access_token }),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
}

/**
 * Register an OAuth app on the given instance. Mastodon is federated — every
 * instance is its own OAuth server — so we register dynamically at connect time
 * instead of pre-creating an app. No stored client id/secret env needed.
 */
export async function registerApp(
  instanceUrl: string,
  redirectUri: string,
): Promise<{ client_id: string; client_secret: string }> {
  const instance = normalizeInstance(instanceUrl);
  const form = new URLSearchParams({
    client_name: "Postbase",
    redirect_uris: redirectUri,
    scopes: OAUTH_SCOPES,
    website: "https://www.postbase.so",
  });
  const res = await fetch(`${instance}/api/v1/apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok || !json.client_id) {
    throw new Error(json.error || `Couldn't register with ${instance} (${res.status})`);
  }
  return { client_id: json.client_id, client_secret: json.client_secret };
}

/** The instance's OAuth authorize URL to redirect the user to. */
export function authorizeUrl(
  instanceUrl: string,
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const instance = normalizeInstance(instanceUrl);
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPES,
    state,
  });
  return `${instance}/oauth/authorize?${p.toString()}`;
}

/** Exchange an authorization code for an access token. */
export async function exchangeCode(
  instanceUrl: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string,
): Promise<string> {
  const instance = normalizeInstance(instanceUrl);
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code,
    scope: OAUTH_SCOPES,
  });
  const res = await fetch(`${instance}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `Token exchange failed (${res.status})`);
  }
  return json.access_token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Upload one attachment and wait until the instance finishes processing it.
async function uploadMedia(
  tokens: MastodonTokens,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: contentType }), `upload.${contentType.split("/")[1] ?? "bin"}`);
  const created = await api<{ id: string; url: string | null }>(tokens.instance, "/api/v2/media", {
    token: tokens.access_token,
    form,
  });
  // A null url means the instance is still processing (video, large images).
  for (let i = 0; created.url === null && i < 10; i++) {
    await sleep(2000);
    const res = await fetch(`${tokens.instance}/api/v1/media/${created.id}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (res.status === 200) break; // done processing
  }
  return created.id;
}

/** Create a status (optionally as a reply). Returns its id + web URL. */
export async function createPost(
  tokens: MastodonTokens,
  text: string,
  media: MastodonMedia[] = [],
  inReplyToId?: string,
  idempotencyKey?: string,
): Promise<{ id: string; url: string }> {
  const mediaIds: string[] = [];
  for (const m of media.slice(0, 4)) {
    const { bytes } = await fetchMedia(m.url, { maxBytes: m.type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES });
    mediaIds.push(await uploadMedia(tokens, bytes, m.type));
  }

  const body: Record<string, unknown> = { status: text };
  if (mediaIds.length) body.media_ids = mediaIds;
  if (inReplyToId) body.in_reply_to_id = inReplyToId;

  const status = await api<{ id: string; url: string }>(tokens.instance, "/api/v1/statuses", {
    token: tokens.access_token,
    body,
    // Mastodon dedupes on this for an hour; pass a key that's stable across retries.
    headers: { "Idempotency-Key": idempotencyKey ?? randomUUID() },
  });
  return { id: status.id, url: status.url };
}

/** Public engagement metrics for a status. */
export async function getPostMetrics(
  tokens: MastodonTokens,
  statusId: string,
): Promise<Record<string, number>> {
  const s = await api<{
    favourites_count?: number;
    reblogs_count?: number;
    replies_count?: number;
  }>(tokens.instance, `/api/v1/statuses/${statusId}`, { token: tokens.access_token });
  return {
    likes: s.favourites_count ?? 0,
    shares: s.reblogs_count ?? 0,
    comments: s.replies_count ?? 0,
  };
}
