import { randomUUID } from "node:crypto";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { postThread, uploadMedia, refreshTokens, type XTokens } from "@/lib/platforms/x";
import {
  createCarouselContainer,
  createImageContainer,
  createVideoContainer,
  publishContainer,
  waitForContainer,
  type MetaTokens,
} from "@/lib/platforms/meta";

const MEDIA_BUCKET = "post-media";

/**
 * Platform publishing adapters — common interface so adding a platform is additive
 * (docs/TECH_STACK.md §4). Each adapter posts via that platform's API using the
 * channel's stored (encrypted) OAuth tokens.
 *
 * X is live. LinkedIn / Instagram remain stubbed until their API access is granted.
 */

export type MediaItem = { url: string; type: string };

export type PublishInput = {
  platform: string;
  body: string;
  threadTail: string[];
  media: MediaItem[];
  channelId: string;
  handle: string | null;
  encryptedTokens: string | null;
  tokenExpiry: string | null;
};

export type PublishResult =
  | { ok: true; platformPostId: string }
  | { ok: false; error: string };

function simulate(platform: string): PublishResult {
  return {
    ok: true,
    platformPostId: `${platform}_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

function isExpiring(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() >= Date.parse(iso) - 120_000; // 2-min buffer
}

async function publishToX(input: PublishInput): Promise<PublishResult> {
  if (!input.encryptedTokens) return { ok: false, error: "X account not connected." };

  let tokens: XTokens;
  try {
    tokens = decryptJson<XTokens>(input.encryptedTokens);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read stored X credentials: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Refresh an expiring access token and persist the new tokens.
  if (isExpiring(input.tokenExpiry) && tokens.refresh_token) {
    try {
      const refreshed = await refreshTokens(tokens.refresh_token);
      tokens = { ...tokens, ...refreshed };
      const db = createAdminClient();
      await db
        .from("channels")
        .update({
          encrypted_tokens: encryptJson(tokens),
          token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("id", input.channelId);
    } catch {
      return { ok: false, error: "X token refresh failed — reconnect the channel." };
    }
  }

  const texts = [input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean);
  try {
    // Upload any media first, then attach the ids to the lead tweet.
    const mediaIds: string[] = [];
    for (const m of input.media) {
      const res = await fetch(m.url);
      if (!res.ok) throw new Error(`Couldn't fetch media (${res.status})`);
      const bytes = await res.arrayBuffer();
      mediaIds.push(await uploadMedia(tokens.access_token, bytes, m.type));
    }
    const { id } = await postThread(tokens.access_token, texts, mediaIds);
    return { ok: true, platformPostId: id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "X publish failed." };
  }
}

/**
 * Instagram requires a public **JPEG** image URL. Our uploads may be PNG, so
 * transcode non-JPEG images to JPEG (via sharp) and re-upload to the public
 * bucket, returning the new public URL. JPEGs pass through untouched.
 */
async function ensureJpegUrl(url: string, type: string): Promise<string> {
  if (type === "image/jpeg" || type === "image/jpg") return url;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch image for Instagram (${res.status}).`);
  const input = Buffer.from(await res.arrayBuffer());

  const sharp = (await import("sharp")).default;
  const jpeg = await sharp(input).jpeg({ quality: 90 }).toBuffer();

  const db = createAdminClient();
  const path = `ig/${randomUUID()}.jpg`;
  const { error } = await db.storage
    .from(MEDIA_BUCKET)
    .upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`Couldn't prepare image for Instagram: ${error.message}`);

  return db.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function publishToInstagram(input: PublishInput): Promise<PublishResult> {
  if (!input.encryptedTokens) return { ok: false, error: "Instagram account not connected." };

  let tokens: MetaTokens;
  try {
    tokens = decryptJson<MetaTokens>(input.encryptedTokens);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read stored Instagram credentials: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const images = input.media.filter((m) => m.type.startsWith("image/"));
  const videos = input.media.filter((m) => m.type.startsWith("video/"));
  if (images.length === 0 && videos.length === 0) {
    return { ok: false, error: "Instagram posts need at least one image or video." };
  }

  // Instagram has a single caption — fold the thread into it rather than dropping it.
  const caption = [input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean).join("\n\n");
  const igId = tokens.ig_user_id;
  const token = tokens.access_token;

  try {
    let creationId: string;

    if (videos.length > 0) {
      // A single Reel/video (Instagram can't mix video with images in one post).
      creationId = await createVideoContainer(igId, token, videos[0].url, caption);
      await waitForContainer(token, creationId);
    } else if (images.length === 1) {
      const jpeg = await ensureJpegUrl(images[0].url, images[0].type);
      creationId = await createImageContainer(igId, token, jpeg, caption);
    } else {
      // 2–10 images -> carousel. Build child containers, then the parent.
      const childIds: string[] = [];
      for (const img of images.slice(0, 10)) {
        const jpeg = await ensureJpegUrl(img.url, img.type);
        childIds.push(await createImageContainer(igId, token, jpeg, "", true));
      }
      creationId = await createCarouselContainer(igId, token, childIds, caption);
    }

    const id = await publishContainer(igId, token, creationId);
    return { ok: true, platformPostId: id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Instagram publish failed." };
  }
}

export async function publish(input: PublishInput): Promise<PublishResult> {
  if (!input.body.trim()) {
    return { ok: false, error: "Post body is empty." };
  }

  switch (input.platform) {
    case "x":
      return publishToX(input);
    case "linkedin":
      // TODO: real LinkedIn Posts API with w_member_social.
      return simulate("linkedin");
    case "instagram":
      return publishToInstagram(input);
    case "youtube":
      return simulate("youtube");
    default:
      return { ok: false, error: `Unsupported platform: ${input.platform}` };
  }
}
