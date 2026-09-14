import { randomUUID } from "node:crypto";

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
};

export type MastodonMedia = { url: string; type: string };

function normalizeInstance(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
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

/** Validate an instance + access token; returns tokens to store. */
export async function connectMastodon(instanceUrl: string, token: string): Promise<MastodonTokens> {
  const instance = normalizeInstance(instanceUrl);
  const account = await api<{ id: string; username: string }>(
    instance,
    "/api/v1/accounts/verify_credentials",
    { token: token.trim() },
  );
  const host = new URL(instance).host;
  return {
    instance,
    access_token: token.trim(),
    account_id: account.id,
    handle: `@${account.username}@${host}`,
  };
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
): Promise<{ id: string; url: string }> {
  const mediaIds: string[] = [];
  for (const m of media.slice(0, 4)) {
    const res = await fetch(m.url);
    if (!res.ok) throw new Error(`Couldn't fetch media (${res.status})`);
    mediaIds.push(await uploadMedia(tokens, await res.arrayBuffer(), m.type));
  }

  const body: Record<string, unknown> = { status: text };
  if (mediaIds.length) body.media_ids = mediaIds;
  if (inReplyToId) body.in_reply_to_id = inReplyToId;

  const status = await api<{ id: string; url: string }>(tokens.instance, "/api/v1/statuses", {
    token: tokens.access_token,
    body,
    headers: { "Idempotency-Key": randomUUID() }, // Mastodon dedupes retries on this
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
