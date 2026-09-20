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
  postPageFeed,
  postPagePhoto,
  uploadUnpublishedPhoto,
  postPageWithPhotos,
  postPageVideo,
  type MetaTokens,
  type FacebookTokens,
} from "@/lib/platforms/meta";
import {
  createPost as liCreatePost,
  uploadImage as liUploadImage,
  refreshTokens as liRefreshTokens,
  postComment as liPostComment,
  type LinkedInTokens,
} from "@/lib/platforms/linkedin";
import {
  initVideoUpload,
  uploadVideoFile,
  initPhotoPost,
  type TikTokPostOptions,
  waitForPublish,
  creatorInfo,
  pickPrivacyLevel,
  refreshTokens as ttRefreshTokens,
  TIKTOK_MAX_SINGLE_CHUNK,
  type TikTokTokens,
} from "@/lib/platforms/tiktok";
import {
  uploadVideo as ytUploadVideo,
  refreshTokens as ytRefreshTokens,
  defaultPrivacyStatus,
  type YouTubeTokens,
} from "@/lib/platforms/youtube";
import {
  createPost as bskyCreatePost,
  BLUESKY_MAX_CHARS,
  type BlueskyTokens,
} from "@/lib/platforms/bluesky";
import {
  createPost as mastoCreatePost,
  MASTODON_MAX_CHARS,
  type MastodonTokens,
} from "@/lib/platforms/mastodon";

const MEDIA_BUCKET = "post-media";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Platform publishing adapters — common interface so adding a platform is additive
 * (docs/TECH_STACK.md §4). Each adapter posts via that platform's API using the
 * channel's stored (encrypted) OAuth tokens.
 *
 * X, Instagram, Facebook, LinkedIn, TikTok, and YouTube are all live.
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
  tiktokPrivacyLevel?: string | null;
  tiktokOptions?: TikTokPostOptions | null;
};

export type PublishResult =
  | { ok: true; platformPostId: string }
  | { ok: false; error: string };

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

// Instagram feed images must be JPEG (no alpha) with an aspect ratio between
// 4:5 (0.8, portrait) and 1.91:1 (1.91, landscape).
const IG_MIN_RATIO = 0.8;
const IG_MAX_RATIO = 1.91;

/**
 * Normalise an image for Instagram: transcode to JPEG, flatten any alpha to
 * white (JPEG can't carry transparency), and letterbox onto the nearest
 * supported aspect ratio when the source is out of range. Re-uploads to the
 * public bucket and returns the new URL. An in-range, alpha-free JPEG passes
 * through untouched.
 */
async function ensureInstagramImageUrl(url: string, type: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch image for Instagram (${res.status}).`);
  const input = Buffer.from(await res.arrayBuffer());

  const sharp = (await import("sharp")).default;
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const ratio = w && h ? w / h : 1;
  const inRange = ratio >= IG_MIN_RATIO && ratio <= IG_MAX_RATIO;

  if ((type === "image/jpeg" || type === "image/jpg") && inRange && !meta.hasAlpha) {
    return url;
  }

  let pipeline = sharp(input).flatten({ background: "#ffffff" });
  if (!inRange && w && h) {
    // Letterbox onto the nearest supported ratio with a white background.
    const [cw, ch] =
      ratio < IG_MIN_RATIO
        ? [Math.round(h * IG_MIN_RATIO), h] // too tall -> pad width
        : [w, Math.round(w / IG_MAX_RATIO)]; // too wide -> pad height
    pipeline = pipeline.resize({ width: cw, height: ch, fit: "contain", background: "#ffffff" });
  }
  const jpeg = await pipeline.jpeg({ quality: 90 }).toBuffer();

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
    } else if (images.length === 1) {
      const jpeg = await ensureInstagramImageUrl(images[0].url, images[0].type);
      creationId = await createImageContainer(igId, token, jpeg, caption);
    } else {
      // 2–10 images -> carousel. Build child containers, then the parent.
      const childIds: string[] = [];
      for (const img of images.slice(0, 10)) {
        const jpeg = await ensureInstagramImageUrl(img.url, img.type);
        childIds.push(await createImageContainer(igId, token, jpeg, "", true));
      }
      creationId = await createCarouselContainer(igId, token, childIds, caption);
    }

    // Wait until the container finishes processing — publishing too early fails
    // with "Media ID is not available". Images usually finish on the first poll.
    await waitForContainer(token, creationId);
    const id = await publishContainer(igId, token, creationId);
    return { ok: true, platformPostId: id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Instagram publish failed." };
  }
}

async function publishToLinkedIn(input: PublishInput): Promise<PublishResult> {
  if (!input.encryptedTokens) return { ok: false, error: "LinkedIn account not connected." };

  let tokens: LinkedInTokens;
  try {
    tokens = decryptJson<LinkedInTokens>(input.encryptedTokens);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read stored LinkedIn credentials: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Refresh an expiring access token when a refresh token is available.
  if (isExpiring(input.tokenExpiry) && tokens.refresh_token) {
    try {
      const refreshed = await liRefreshTokens(tokens.refresh_token);
      tokens = {
        ...tokens,
        access_token: refreshed.access_token!,
        refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
      };
      const db = createAdminClient();
      await db
        .from("channels")
        .update({
          encrypted_tokens: encryptJson(tokens),
          token_expiry: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
            : null,
        })
        .eq("id", input.channelId);
    } catch {
      return { ok: false, error: "LinkedIn token expired — reconnect the channel." };
    }
  }

  // LinkedIn isn't a thread — part 1 is the post; any following parts become a
  // first comment (LinkedIn supports comments under the existing scope).
  const commentary = input.body.trim();
  if (!commentary) return { ok: false, error: "LinkedIn post is empty." };
  const firstComment = input.threadTail.map((t) => t.trim()).filter(Boolean).join("\n\n");

  try {
    // Upload any images (PNG/JPEG both fine — no transcode needed). Video is not
    // supported yet, so non-image media is skipped.
    const imageUrns: string[] = [];
    const images = input.media.filter((m) => m.type.startsWith("image/"));
    for (const img of images.slice(0, 20)) {
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(`Couldn't fetch media (${res.status})`);
      imageUrns.push(await liUploadImage(tokens.access_token, tokens.author_urn, await res.arrayBuffer()));
    }
    const id = await liCreatePost(tokens.access_token, tokens.author_urn, commentary, imageUrns);

    // First comment — best-effort. Never fail the published post over it.
    if (id && firstComment) {
      try {
        await liPostComment(tokens.access_token, tokens.author_urn, id, firstComment);
      } catch {
        // swallow — the post went out; the comment is a nice-to-have.
      }
    }
    return { ok: true, platformPostId: id || "urn:li:share:unknown" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "LinkedIn publish failed." };
  }
}

// Serve bucket media through our own (TikTok-verified) domain.
function proxiedMediaUrl(url: string): string {
  return `${APP_URL}/api/media/proxy?src=${encodeURIComponent(url)}`;
}

async function publishToTikTok(input: PublishInput): Promise<PublishResult> {
  if (!input.encryptedTokens) return { ok: false, error: "TikTok account not connected." };

  let tokens: TikTokTokens;
  try {
    tokens = decryptJson<TikTokTokens>(input.encryptedTokens);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read stored TikTok credentials: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Refresh an expiring access token when a refresh token is available.
  if (isExpiring(input.tokenExpiry) && tokens.refresh_token) {
    try {
      const refreshed = await ttRefreshTokens(tokens.refresh_token);
      tokens = {
        ...tokens,
        access_token: refreshed.access_token!,
        refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
      };
      const db = createAdminClient();
      await db
        .from("channels")
        .update({
          encrypted_tokens: encryptJson(tokens),
          token_expiry: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
            : null,
        })
        .eq("id", input.channelId);
    } catch {
      return { ok: false, error: "TikTok token expired — reconnect the channel." };
    }
  }

  const images = input.media.filter((m) => m.type.startsWith("image/"));
  const videos = input.media.filter((m) => m.type.startsWith("video/"));
  if (images.length === 0 && videos.length === 0) {
    return { ok: false, error: "TikTok posts need a video or at least one image." };
  }

  const caption = [input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean).join(" ");

  // Privacy level: the user's choice, unless TIKTOK_PRIVACY_LEVEL is set — which
  // acts as a hard override so the app can be capped to SELF_ONLY while it's
  // unaudited (unset it after TikTok approves public posting). Clamped to what
  // creator_info reports this creator can use (TikTok requires that query first).
  const override = process.env.TIKTOK_PRIVACY_LEVEL?.trim();
  const preferred = override || input.tiktokPrivacyLevel || "SELF_ONLY";
  let privacy = preferred;
  try {
    const info = await creatorInfo(tokens.access_token);
    privacy = pickPrivacyLevel(info.privacy_level_options, preferred);
  } catch {
    // Fall back to the preferred level; the init call will surface any error.
  }

  try {
    let publishId: string;

    if (videos.length > 0) {
      // Video: upload the bytes directly (FILE_UPLOAD) — no domain verification.
      const res = await fetch(videos[0].url);
      if (!res.ok) throw new Error(`Couldn't fetch video (${res.status})`);
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength > TIKTOK_MAX_SINGLE_CHUNK) {
        throw new Error("TikTok video must be under 64MB.");
      }
      const init = await initVideoUpload(
        tokens.access_token,
        caption,
        privacy,
        bytes.byteLength,
        input.tiktokOptions ?? undefined,
      );
      await uploadVideoFile(init.uploadUrl, bytes, videos[0].type || "video/mp4");
      publishId = init.publishId;
    } else {
      // Photos: TikTok pulls from our proxy URL (requires a verified domain).
      publishId = await initPhotoPost(
        tokens.access_token,
        images.slice(0, 35).map((m) => proxiedMediaUrl(m.url)),
        caption,
        privacy,
        input.tiktokOptions ?? undefined,
      );
    }

    const finished = await waitForPublish(tokens.access_token, publishId);
    // Prefer the real post id (lets us read metrics later); fall back to publish id.
    return { ok: true, platformPostId: finished.postId ?? publishId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "TikTok publish failed." };
  }
}

async function publishToYouTube(input: PublishInput): Promise<PublishResult> {
  if (!input.encryptedTokens) return { ok: false, error: "YouTube account not connected." };

  let tokens: YouTubeTokens;
  try {
    tokens = decryptJson<YouTubeTokens>(input.encryptedTokens);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read stored YouTube credentials: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Google access tokens last ~1h — refresh when expiring.
  if (isExpiring(input.tokenExpiry) && tokens.refresh_token) {
    try {
      const refreshed = await ytRefreshTokens(tokens.refresh_token);
      tokens = { ...tokens, access_token: refreshed.access_token! };
      const db = createAdminClient();
      await db
        .from("channels")
        .update({
          encrypted_tokens: encryptJson(tokens),
          token_expiry: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
            : null,
        })
        .eq("id", input.channelId);
    } catch {
      return { ok: false, error: "YouTube token expired — reconnect the channel." };
    }
  }

  const video = input.media.find((m) => m.type.startsWith("video/"));
  if (!video) return { ok: false, error: "YouTube posts need a video." };

  const description = [input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean).join("\n\n");
  const title = (input.body.trim() || "Postbase upload").slice(0, 100);

  try {
    const res = await fetch(video.url);
    if (!res.ok) throw new Error(`Couldn't fetch video (${res.status})`);
    const bytes = await res.arrayBuffer();
    const id = await ytUploadVideo(tokens.access_token, bytes, {
      title,
      description,
      privacy: defaultPrivacyStatus(),
      mimeType: video.type,
    });
    return { ok: true, platformPostId: id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "YouTube publish failed." };
  }
}

async function publishToFacebook(input: PublishInput): Promise<PublishResult> {
  if (!input.encryptedTokens) return { ok: false, error: "Facebook Page not connected." };

  let tokens: FacebookTokens;
  try {
    tokens = decryptJson<FacebookTokens>(input.encryptedTokens);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read stored Facebook credentials: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const message = [input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean).join("\n\n");
  const images = input.media.filter((m) => m.type.startsWith("image/"));
  const videos = input.media.filter((m) => m.type.startsWith("video/"));
  const { access_token: token, page_id: pageId } = tokens;

  try {
    let id: string;
    if (videos.length > 0) {
      id = await postPageVideo(token, pageId, videos[0].url, message);
    } else if (images.length === 1) {
      id = await postPagePhoto(token, pageId, images[0].url, message);
    } else if (images.length > 1) {
      const fbids: string[] = [];
      for (const img of images.slice(0, 10)) {
        fbids.push(await uploadUnpublishedPhoto(token, pageId, img.url));
      }
      id = await postPageWithPhotos(token, pageId, message, fbids);
    } else {
      if (!message) return { ok: false, error: "Facebook post is empty." };
      id = await postPageFeed(token, pageId, message);
    }
    return { ok: true, platformPostId: id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Facebook publish failed." };
  }
}

async function publishToBluesky(input: PublishInput): Promise<PublishResult> {
  if (!input.encryptedTokens) return { ok: false, error: "Bluesky account not connected." };

  let tokens: BlueskyTokens;
  try {
    tokens = decryptJson<BlueskyTokens>(input.encryptedTokens);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read stored Bluesky credentials: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Each segment is its own post (300-grapheme cap); a thread becomes a reply
  // chain. Media rides on the lead post only, mirroring the X adapter.
  const segments = [input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean);
  const clip = (s: string) => (Array.from(s).length > BLUESKY_MAX_CHARS ? Array.from(s).slice(0, BLUESKY_MAX_CHARS).join("") : s);

  try {
    let root: { uri: string; cid: string } | undefined;
    let parent: { uri: string; cid: string } | undefined;
    let leadUri = "";
    for (let i = 0; i < segments.length; i++) {
      const media = i === 0 ? input.media : [];
      const reply = root && parent ? { root, parent } : undefined;
      const { uri, cid } = await bskyCreatePost(tokens, clip(segments[i]), media, reply);
      if (i === 0) {
        root = { uri, cid };
        leadUri = uri;
      }
      parent = { uri, cid };
    }
    return { ok: true, platformPostId: leadUri };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bluesky publish failed." };
  }
}

async function publishToMastodon(input: PublishInput): Promise<PublishResult> {
  if (!input.encryptedTokens) return { ok: false, error: "Mastodon account not connected." };

  let tokens: MastodonTokens;
  try {
    tokens = decryptJson<MastodonTokens>(input.encryptedTokens);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read stored Mastodon credentials: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const segments = [input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean);
  const clip = (s: string) =>
    Array.from(s).length > MASTODON_MAX_CHARS ? Array.from(s).slice(0, MASTODON_MAX_CHARS).join("") : s;

  try {
    let replyTo: string | undefined;
    let leadId = "";
    for (let i = 0; i < segments.length; i++) {
      const media = i === 0 ? input.media : [];
      const { id } = await mastoCreatePost(tokens, clip(segments[i]), media, replyTo);
      if (i === 0) leadId = id;
      replyTo = id; // chain the thread as replies
    }
    return { ok: true, platformPostId: leadId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Mastodon publish failed." };
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
      return publishToLinkedIn(input);
    case "instagram":
      return publishToInstagram(input);
    case "facebook":
      return publishToFacebook(input);
    case "tiktok":
      return publishToTikTok(input);
    case "youtube":
      return publishToYouTube(input);
    case "bluesky":
      return publishToBluesky(input);
    case "mastodon":
      return publishToMastodon(input);
    default:
      return { ok: false, error: `Unsupported platform: ${input.platform}` };
  }
}
