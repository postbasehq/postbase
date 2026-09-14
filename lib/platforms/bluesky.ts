import sharp from "sharp";

/**
 * Bluesky (AT Protocol) integration — raw XRPC over fetch, matching the
 * codebase's SDK-free style.
 *
 * Auth is refreshingly simple: no OAuth app, no review. The user creates an
 * "app password" (bsky.app → Settings → App Passwords) and we log in with their
 * handle + that password. We store the app password (encrypted at rest) and mint
 * a short-lived session at publish/read time — app passwords don't expire until
 * revoked, so there's no refresh-token dance.
 */

const DEFAULT_SERVICE = "https://bsky.social";
export const BLUESKY_MAX_CHARS = 300; // graphemes
const MAX_IMAGE_BYTES = 976_560; // Bluesky's per-blob size limit (~0.95 MB)
const MAX_IMAGES = 4;

export type BlueskyTokens = {
  service: string; // PDS base URL
  identifier: string; // handle/DID used to log in
  app_password: string; // encrypted at rest by the caller
  did: string;
  handle: string;
};

export type BlueskyMedia = { url: string; type: string };

type Session = { accessJwt: string; refreshJwt: string; did: string; handle: string };
type BlobRef = unknown;

async function xrpc<T>(
  service: string,
  method: string,
  opts: { auth?: string; body?: unknown; raw?: Uint8Array; contentType?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.auth) headers.Authorization = `Bearer ${opts.auth}`;
  let body: BodyInit | undefined;
  if (opts.raw) {
    headers["Content-Type"] = opts.contentType ?? "application/octet-stream";
    body = opts.raw as unknown as BodyInit; // Node fetch accepts Uint8Array at runtime
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${service}/xrpc/${method}`, {
    method: body ? "POST" : "GET",
    headers,
    body,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (json.message as string) || (json.error as string) || `Bluesky ${method} failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

async function createSession(service: string, identifier: string, password: string): Promise<Session> {
  return xrpc<Session>(service, "com.atproto.server.createSession", {
    body: { identifier, password },
  });
}

/** Validate a handle + app password by logging in; returns tokens to store. */
export async function connectBluesky(
  handle: string,
  appPassword: string,
  service = DEFAULT_SERVICE,
): Promise<BlueskyTokens> {
  // Accept just a username ("alice") and default the domain; a value that already
  // contains a dot is treated as a full handle (custom domains like alice.com).
  const raw = handle.trim().replace(/^@/, "").toLowerCase();
  const id = raw.includes(".") ? raw : `${raw}.bsky.social`;
  const password = appPassword.trim();
  const session = await createSession(service, id, password);
  return { service, identifier: id, app_password: password, did: session.did, handle: session.handle };
}

// Link facets make URLs clickable. Bluesky indexes text by UTF-8 byte offsets.
function linkFacets(text: string): unknown[] {
  const enc = new TextEncoder();
  const facets: unknown[] = [];
  const re = /https?:\/\/[^\s]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const url = m[0].replace(/[.,)\]]+$/, ""); // drop trailing punctuation
    const byteStart = enc.encode(text.slice(0, m.index)).length;
    const byteEnd = byteStart + enc.encode(url).length;
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: url }],
    });
  }
  return facets;
}

async function compressForBluesky(bytes: ArrayBuffer): Promise<Buffer> {
  const src = Buffer.from(bytes);
  let quality = 90;
  let out = await sharp(src).rotate().jpeg({ quality }).toBuffer();
  // Shrink until under the blob cap (dimension + quality).
  let width = 2048;
  while (out.byteLength > MAX_IMAGE_BYTES && (quality > 40 || width > 800)) {
    if (quality > 40) quality -= 15;
    else width = Math.max(800, Math.round(width * 0.8));
    out = await sharp(src).rotate().resize({ width, withoutEnlargement: true }).jpeg({ quality }).toBuffer();
  }
  return out;
}

async function uploadImage(service: string, accessJwt: string, jpeg: Buffer): Promise<BlobRef> {
  const { blob } = await xrpc<{ blob: BlobRef }>(service, "com.atproto.repo.uploadBlob", {
    auth: accessJwt,
    raw: new Uint8Array(jpeg),
    contentType: "image/jpeg",
  });
  return blob;
}

type ReplyRef = { root: { uri: string; cid: string }; parent: { uri: string; cid: string } };

/** Create a single post (optionally as a reply). Returns its AT URI + cid + web URL. */
export async function createPost(
  tokens: BlueskyTokens,
  text: string,
  media: BlueskyMedia[] = [],
  reply?: ReplyRef,
): Promise<{ uri: string; cid: string; url: string }> {
  const session = await createSession(tokens.service, tokens.identifier, tokens.app_password);

  const record: Record<string, unknown> = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
  };
  const facets = linkFacets(text);
  if (facets.length) record.facets = facets;
  if (reply) record.reply = reply;

  const images = media.filter((m) => m.type.startsWith("image/")).slice(0, MAX_IMAGES);
  if (images.length) {
    const uploaded: { alt: string; image: BlobRef }[] = [];
    for (const img of images) {
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(`Couldn't fetch media (${res.status})`);
      const jpeg = await compressForBluesky(await res.arrayBuffer());
      uploaded.push({ alt: "", image: await uploadImage(tokens.service, session.accessJwt, jpeg) });
    }
    record.embed = { $type: "app.bsky.embed.images", images: uploaded };
  }

  const created = await xrpc<{ uri: string; cid: string }>(tokens.service, "com.atproto.repo.createRecord", {
    auth: session.accessJwt,
    body: { repo: session.did, collection: "app.bsky.feed.post", record },
  });
  const rkey = created.uri.split("/").pop();
  return {
    uri: created.uri,
    cid: created.cid,
    url: `https://bsky.app/profile/${tokens.handle}/post/${rkey}`,
  };
}

/** Public engagement metrics for a post (Bluesky has no impressions). */
export async function getPostMetrics(tokens: BlueskyTokens, uri: string): Promise<Record<string, number>> {
  const session = await createSession(tokens.service, tokens.identifier, tokens.app_password);
  const data = await xrpc<{
    posts: { likeCount?: number; repostCount?: number; replyCount?: number }[];
  }>(tokens.service, `app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`, {
    auth: session.accessJwt,
  });
  const p = data.posts?.[0] ?? {};
  return { likes: p.likeCount ?? 0, shares: p.repostCount ?? 0, comments: p.replyCount ?? 0 };
}
