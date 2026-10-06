import { randomUUID } from "node:crypto";
import { decryptJson } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { postThread, uploadMedia, refreshTokens, X_MAX_IMAGES, type XTokens } from "@/lib/platforms/x";
import {
  createCarouselContainer,
  createImageContainer,
  createVideoContainer,
  publishContainer,
  containerStatus,
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
  TIKTOK_MAX_VIDEO,
  type TikTokTokens,
} from "@/lib/platforms/tiktok";
import {
  uploadVideo as ytUploadVideo,
  refreshTokens as ytRefreshTokens,
  setThumbnail as ytSetThumbnail,
  defaultPrivacyStatus,
  YouTubeUploadUnconfirmed,
  type YouTubePostOptions,
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
import { freshTikTokTokens } from "@/lib/platforms/tiktok-session";
import { charCount } from "@/lib/post-validation";
import { refreshChannelTokens, refreshFailureMessage } from "@/lib/platforms/token-refresh";
import { fetchMedia, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/platforms/fetch-media";

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
  /** YouTube visibility chosen in the composer; null → server default. */
  youtubePrivacy?: string | null;
  /** YouTube title, thumbnail and audience chosen in the composer. */
  youtubeOptions?: YouTubePostOptions | null;
  tiktokOptions?: TikTokPostOptions | null;
  /** An upload still processing from an earlier run (Instagram container id). */
  pendingRef?: string | null;
  /** X, Bluesky, Mastodon: thread posts already sent by an earlier attempt, to continue after. */
  threadIds?: string[] | null;
  /** X, Bluesky, Mastodon: called with the thread's post ids after each one goes out. */
  onThreadProgress?: (ids: string[]) => Promise<void>;
  /** Stable per target across retries (the target id), for platforms that dedupe on it. */
  idempotencyKey?: string;
};

export type PublishResult =
  | { ok: true; platformPostId: string; warning?: string }
  /**
   * Failed. With `pendingRef`: still processing on the platform's side, check
   * it again next run. With `uncertain`: the platform may already have the
   * post, so it must not be sent again automatically.
   */
  | { ok: false; error: string; pendingRef?: string; uncertain?: boolean };

function isExpiring(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() >= Date.parse(iso) - 120_000; // 2-min buffer
}

/** The posts an X send is made of: the body, then each thread part. */
export function xTexts(body: string, threadTail: string[]): string[] {
  return [body, ...threadTail].map((t) => t.trim()).filter(Boolean);
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

  // Refresh an expiring access token (one refresh per channel at a time; X
  // refresh tokens are single-use). "Reconnect" only if X truly refused it.
  if (isExpiring(input.tokenExpiry) && tokens.refresh_token) {
    try {
      ({ tokens } = await refreshChannelTokens<XTokens>({ channelId: input.channelId, encrypted: input.encryptedTokens, refresh: refreshTokens, label: "X" }));
    } catch (e) {
      return { ok: false, error: refreshFailureMessage(e, "X") };
    }
  }

  const texts = xTexts(input.body, input.threadTail);
  const resumeIds = input.threadIds ?? [];
  if (resumeIds.length >= texts.length && resumeIds[0]) return { ok: true, platformPostId: resumeIds[0] };
  try {
    // X takes one video or up to 4 images per post — say so rather than
    // surfacing X's cryptic "media ids are invalid".
    const videos = input.media.filter((m) => m.type.startsWith("video/"));
    if (videos.length > 0 && input.media.length > 1) {
      return { ok: false, error: "X allows either one video or up to 4 images per post." };
    }
    if (input.media.length > X_MAX_IMAGES) {
      return { ok: false, error: `X allows up to ${X_MAX_IMAGES} images per post.` };
    }

    // Upload any media first (videos in chunks), then attach the ids to the lead tweet.
    // Resuming after the first post went out: its media is already attached.
    const mediaIds: string[] = [];
    for (const m of resumeIds.length > 0 ? [] : input.media) {
      const { bytes } = await fetchMedia(m.url, { maxBytes: m.type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES });
      mediaIds.push(await uploadMedia(tokens.access_token, bytes, m.type));
    }
    const { id } = await postThread(tokens.access_token, texts, mediaIds, {
      resumeIds,
      onPosted: input.onThreadProgress,
    });
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
  const input = Buffer.from((await fetchMedia(url, { maxBytes: MAX_IMAGE_BYTES, what: "image for Instagram" })).bytes);

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

const IG_PROCESSING = "Instagram is still processing the video.";

/**
 * Publish a finished container. If the call errors we can't tell whether it
 * went out (the response may just be lost), so the container stays pending:
 * next run reads its status — PUBLISHED means done, FINISHED means try again —
 * instead of uploading a second copy.
 */
async function publishIgContainer(igId: string, token: string, creationId: string): Promise<PublishResult> {
  try {
    return { ok: true, platformPostId: await publishContainer(igId, token, creationId) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Instagram publish failed.", pendingRef: creationId };
  }
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
    // An upload from an earlier run: check it rather than uploading again.
    if (input.pendingRef) {
      const st = await containerStatus(token, input.pendingRef);
      if (st.code === "FINISHED") return publishIgContainer(igId, token, input.pendingRef);
      if (st.code === "PUBLISHED") {
        // Went out on an earlier run whose result was lost: never post it twice.
        return { ok: true, platformPostId: input.pendingRef };
      }
      if (st.code === "IN_PROGRESS") {
        return { ok: false, error: IG_PROCESSING, pendingRef: input.pendingRef };
      }
      // ERROR / EXPIRED: this upload is dead. Report it, and upload afresh on a retry.
      return {
        ok: false,
        error: `Instagram couldn’t process the media (${st.code.toLowerCase()}${st.detail ? `: ${st.detail}` : ""}).`,
      };
    }

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

    // Publishing before the container finishes fails ("Media ID is not
    // available"). Images finish at once; Reels can take minutes, so wait a
    // little, then leave it to the next run instead of holding the cron.
    for (let i = 0; i < 8; i++) {
      const st = await containerStatus(token, creationId);
      if (st.code === "FINISHED") return publishIgContainer(igId, token, creationId);
      if (st.code === "ERROR" || st.code === "EXPIRED") {
        throw new Error(`Instagram couldn’t process the media (${st.code.toLowerCase()}${st.detail ? `: ${st.detail}` : ""}).`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    return { ok: false, error: IG_PROCESSING, pendingRef: creationId };
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

  // Without a refresh token a LinkedIn connection simply lapses after 60 days.
  if (!tokens.refresh_token && input.tokenExpiry && Date.parse(input.tokenExpiry) <= Date.now()) {
    return { ok: false, error: "LinkedIn token expired (LinkedIn connections last 60 days) — reconnect the channel." };
  }

  // Refresh an expiring access token when a refresh token is available.
  if (isExpiring(input.tokenExpiry) && tokens.refresh_token) {
    try {
      ({ tokens } = await refreshChannelTokens<LinkedInTokens>({ channelId: input.channelId, encrypted: input.encryptedTokens, refresh: liRefreshTokens, label: "LinkedIn" }));
    } catch (e) {
      return { ok: false, error: refreshFailureMessage(e, "LinkedIn") };
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
      const { bytes } = await fetchMedia(img.url, { maxBytes: MAX_IMAGE_BYTES, what: "image" });
      imageUrns.push(await liUploadImage(tokens.access_token, tokens.author_urn, bytes));
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
    tokens = await freshTikTokTokens(input.channelId, input.encryptedTokens, input.tokenExpiry);
  } catch (e) {
    return { ok: false, error: refreshFailureMessage(e, "TikTok") };
  }

  const images = input.media.filter((m) => m.type.startsWith("image/"));
  const videos = input.media.filter((m) => m.type.startsWith("video/"));
  if (images.length === 0 && videos.length === 0) {
    return { ok: false, error: "TikTok posts need a video or at least one image." };
  }

  const caption = [input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean).join(" ");

  // Privacy level: the user's choice, unless TIKTOK_PRIVACY_LEVEL is set — a hard
  // cap for sandbox/unaudited apps (leave it unset in production now that the app
  // is audited). Clamped to what creator_info reports this creator can use (TikTok
  // requires that query first).
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
      const { bytes } = await fetchMedia(videos[0].url, { maxBytes: MAX_VIDEO_BYTES, what: "video" });
      if (bytes.byteLength > TIKTOK_MAX_VIDEO) {
        throw new Error("TikTok videos can be up to 4GB.");
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
      ({ tokens } = await refreshChannelTokens<YouTubeTokens>({ channelId: input.channelId, encrypted: input.encryptedTokens, refresh: ytRefreshTokens, label: "YouTube" }));
    } catch (e) {
      return { ok: false, error: refreshFailureMessage(e, "YouTube") };
    }
  }

  const video = input.media.find((m) => m.type.startsWith("video/"));
  if (!video) return { ok: false, error: "YouTube posts need a video." };

  // YouTube rejects "<" and ">" in titles and descriptions. The title is the
  // one set in the composer, else the post's first line (max 100 chars); the
  // post text becomes the description.
  const opts = input.youtubeOptions ?? {};
  const clean = (t: string) => t.replace(/[<>]/g, "");
  const description = clean([input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean).join("\n\n"));
  const firstLine = input.body.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const title = Array.from(clean(opts.title?.trim() || firstLine) || "Postbase upload").slice(0, 100).join("").trim();

  try {
    const { bytes } = await fetchMedia(video.url, { maxBytes: MAX_VIDEO_BYTES, what: "video" });
    const id = await ytUploadVideo(tokens.access_token, bytes, {
      title,
      description,
      privacy: input.youtubePrivacy || defaultPrivacyStatus(),
      madeForKids: opts.madeForKids === true,
      mimeType: video.type,
    });
    // The video is live at this point, so a thumbnail problem is a warning,
    // not a failure (retrying would upload the video twice).
    let warning: string | undefined;
    if (opts.thumbnailUrl) {
      try {
        const thumb = await fetchMedia(opts.thumbnailUrl, { maxBytes: MAX_IMAGE_BYTES, what: "thumbnail" });
        const type = thumb.type?.split(";")[0] || "image/jpeg";
        await ytSetThumbnail(tokens.access_token, id, thumb.bytes, type);
      } catch (e) {
        warning = e instanceof Error ? e.message : "Setting the thumbnail failed.";
      }
    }
    return { ok: true, platformPostId: id, warning };
  } catch (e) {
    if (e instanceof YouTubeUploadUnconfirmed) return { ok: false, error: e.message, uncertain: true };
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
  // Bluesky counts graphemes (lib/post-validation blocks longer posts before they
  // get here). Only trim as a last resort, by graphemes, so emoji survive intact.
  const clip = (s: string) => clipTo("bluesky", s, BLUESKY_MAX_CHARS);

  // A retry continues after the parts an earlier attempt already posted (kept
  // as "uri|cid", which a reply needs) instead of posting the lead again.
  const sent = (input.threadIds ?? []).filter(Boolean);
  const ref = (s: string) => {
    const [uri, cid] = s.split("|");
    return { uri, cid };
  };
  if (sent.length >= segments.length && sent[0]) return { ok: true, platformPostId: ref(sent[0]).uri };

  try {
    let root = sent.length ? ref(sent[0]) : undefined;
    let parent = sent.length ? ref(sent[sent.length - 1]) : undefined;
    for (let i = sent.length; i < segments.length; i++) {
      const media = i === 0 ? input.media : [];
      const reply = root && parent ? { root, parent } : undefined;
      const { uri, cid } = await bskyCreatePost(tokens, clip(segments[i]), media, reply);
      if (i === 0) root = { uri, cid };
      parent = { uri, cid };
      sent.push(`${uri}|${cid}`);
      await input.onThreadProgress?.([...sent]);
    }
    return { ok: true, platformPostId: root!.uri };
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
  // Mastodon counts a URL as 23; only trim when its own count is over the limit.
  const clip = (s: string) => clipTo("mastodon", s, MASTODON_MAX_CHARS);

  // A retry continues after the parts an earlier attempt already posted.
  const sent = (input.threadIds ?? []).filter(Boolean);
  if (sent.length >= segments.length && sent[0]) return { ok: true, platformPostId: sent[0] };

  try {
    let replyTo: string | undefined = sent[sent.length - 1];
    for (let i = sent.length; i < segments.length; i++) {
      const media = i === 0 ? input.media : [];
      // Same key on every retry of this part: if an earlier response was lost,
      // Mastodon returns the status it already created instead of a duplicate.
      const key = input.idempotencyKey ? `${input.idempotencyKey}:${i}` : undefined;
      const { id } = await mastoCreatePost(tokens, clip(segments[i]), media, replyTo, key);
      replyTo = id; // chain the thread as replies
      sent.push(id);
      await input.onThreadProgress?.([...sent]);
    }
    return { ok: true, platformPostId: sent[0] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Mastodon publish failed." };
  }
}

/**
 * Last-resort trim for a post that's over a network's limit by that network's
 * own count (the composer and API block these first). Under the limit, the text
 * is sent untouched; over it, whole graphemes are dropped from the end.
 */
function clipTo(platform: string, text: string, limit: number): string {
  if (charCount(platform, text) <= limit) return text;
  const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
  const parts = Array.from(seg.segment(text), (x) => x.segment);
  while (parts.length && charCount(platform, parts.join("")) > limit) parts.pop();
  return parts.join("");
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
