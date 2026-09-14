/**
 * Meta (Facebook Login) OAuth + Instagram Graph API publishing helpers.
 *
 * Instagram content publishing works only for Instagram **Business/Creator**
 * accounts that are linked to a Facebook Page. The flow:
 *   1. Facebook OAuth dialog -> short-lived user token
 *   2. exchange for a long-lived user token (~60 days)
 *   3. /me/accounts -> the Page + its (non-expiring) Page access token
 *   4. the Page's linked instagram_business_account -> the IG user id
 * Publishing is two steps: create a media container, then publish it.
 *
 * Requires META_APP_ID, META_APP_SECRET, META_CALLBACK_URL (+ optional
 * META_GRAPH_API_VERSION, default v25.0).
 */

const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];
// Note: instagram_manage_insights (post metrics/analytics) is intentionally NOT
// requested here — Meta rejects it as an "invalid scope" until it's added to the
// app's permissions and granted via App Review. Add it back once approved.

function version(): string {
  return process.env.META_GRAPH_API_VERSION ?? "v25.0";
}

function graph(): string {
  return `https://graph.facebook.com/${version()}`;
}

/** Tokens we persist (encrypted) for an Instagram channel. */
export type MetaTokens = {
  access_token: string; // long-lived Page access token — used to publish
  ig_user_id: string; // Instagram Business account id
  page_id: string;
  user_access_token?: string; // long-lived user token (kept for future re-derivation)
};

export function metaConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_CALLBACK_URL,
  );
}

// Facebook Page publishing scopes (reuses the same Meta app / Facebook Login).
// pages_manage_posts must be added to the app's permissions to be granted.
export const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
];

export function authorizeUrl(
  state: string,
  opts?: { redirectUri?: string; scopes?: string[] },
): string {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: opts?.redirectUri ?? process.env.META_CALLBACK_URL!,
    state,
    scope: (opts?.scopes ?? SCOPES).join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${version()}/dialog/oauth?${p.toString()}`;
}

type GraphError = { error?: { message?: string; type?: string; code?: number } };

async function graphJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as T & GraphError;
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Meta Graph error ${res.status}`);
  }
  return json;
}

/** Exchange an OAuth code for a short-lived user access token. */
export async function exchangeCode(code: string, redirectUri?: string): Promise<string> {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri ?? process.env.META_CALLBACK_URL!,
    code,
  });
  const json = await graphJson<{ access_token?: string }>(`${graph()}/oauth/access_token?${p}`);
  if (!json.access_token) throw new Error("Meta code exchange returned no token.");
  return json.access_token;
}

/** Exchange a short-lived user token for a long-lived one (~60 days). */
export async function longLivedToken(
  shortToken: string,
): Promise<{ access_token: string; expires_in?: number }> {
  const p = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  });
  const json = await graphJson<{ access_token?: string; expires_in?: number }>(
    `${graph()}/oauth/access_token?${p}`,
  );
  if (!json.access_token) throw new Error("Meta long-lived token exchange returned no token.");
  return { access_token: json.access_token, expires_in: json.expires_in };
}

/** Find the first Page with a linked IG Business account and return its ids/tokens. */
export async function resolveInstagram(userToken: string): Promise<{
  igUserId: string;
  username: string;
  pageId: string;
  pageAccessToken: string;
}> {
  const p = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: userToken,
  });
  const json = await graphJson<{
    data?: {
      id: string;
      access_token: string;
      instagram_business_account?: { id: string; username?: string };
    }[];
  }>(`${graph()}/me/accounts?${p}`);

  const page = (json.data ?? []).find((pg) => pg.instagram_business_account?.id);
  if (!page || !page.instagram_business_account) {
    throw new Error(
      "No Instagram Business account is linked to your Facebook Pages. Convert the IG account to Business/Creator and link it to a Page.",
    );
  }
  return {
    igUserId: page.instagram_business_account.id,
    username: page.instagram_business_account.username ?? "",
    pageId: page.id,
    pageAccessToken: page.access_token,
  };
}

function form(params: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  };
}

/* ── Facebook Page publishing ─────────────────────────────────────────────── */

export type FacebookTokens = {
  access_token: string; // long-lived Page access token
  page_id: string;
  page_name?: string;
};

/** List the Facebook Pages the user manages, with their (long-lived) tokens. */
export async function resolvePages(
  userToken: string,
): Promise<{ id: string; name: string; access_token: string }[]> {
  const p = new URLSearchParams({ fields: "id,name,access_token", access_token: userToken });
  const json = await graphJson<{
    data?: { id: string; name: string; access_token: string }[];
  }>(`${graph()}/me/accounts?${p}`);
  return json.data ?? [];
}

/** Publish a text post to a Page feed. Returns the post id. */
export async function postPageFeed(pageToken: string, pageId: string, message: string): Promise<string> {
  const json = await graphJson<{ id?: string }>(
    `${graph()}/${pageId}/feed`,
    form({ message, access_token: pageToken }),
  );
  if (!json.id) throw new Error("Facebook feed post returned no id.");
  return json.id;
}

/** Publish a single photo (with caption) to a Page. Returns the post id. */
export async function postPagePhoto(
  pageToken: string,
  pageId: string,
  imageUrl: string,
  caption: string,
): Promise<string> {
  const json = await graphJson<{ id?: string; post_id?: string }>(
    `${graph()}/${pageId}/photos`,
    form({ url: imageUrl, caption, access_token: pageToken }),
  );
  const id = json.post_id ?? json.id;
  if (!id) throw new Error("Facebook photo post returned no id.");
  return id;
}

/** Upload an unpublished photo (for a multi-photo post). Returns the media id. */
export async function uploadUnpublishedPhoto(
  pageToken: string,
  pageId: string,
  imageUrl: string,
): Promise<string> {
  const json = await graphJson<{ id?: string }>(
    `${graph()}/${pageId}/photos`,
    form({ url: imageUrl, published: "false", access_token: pageToken }),
  );
  if (!json.id) throw new Error("Facebook photo upload returned no id.");
  return json.id;
}

/** Publish a feed post with attached (already-uploaded) photos. */
export async function postPageWithPhotos(
  pageToken: string,
  pageId: string,
  message: string,
  mediaFbids: string[],
): Promise<string> {
  const params: Record<string, string> = { message, access_token: pageToken };
  mediaFbids.forEach((id, i) => {
    params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
  });
  const json = await graphJson<{ id?: string }>(`${graph()}/${pageId}/feed`, form(params));
  if (!json.id) throw new Error("Facebook post returned no id.");
  return json.id;
}

/** Publish a video to a Page (Facebook fetches the URL). Returns the video/post id. */
export async function postPageVideo(
  pageToken: string,
  pageId: string,
  videoUrl: string,
  description: string,
): Promise<string> {
  const json = await graphJson<{ id?: string }>(
    `${graph()}/${pageId}/videos`,
    form({ file_url: videoUrl, description, access_token: pageToken }),
  );
  if (!json.id) throw new Error("Facebook video post returned no id.");
  return json.id;
}

/** Page post metrics (normalized): impressions, likes (reactions), comments, shares. */
export async function getPagePostMetrics(
  pageToken: string,
  postId: string,
): Promise<Record<string, number>> {
  const p = new URLSearchParams({
    fields:
      "reactions.summary(true).limit(0),comments.summary(true).limit(0),shares,insights.metric(post_impressions)",
    access_token: pageToken,
  });
  const json = await graphJson<{
    reactions?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
    insights?: { data?: { name: string; values?: { value?: number }[] }[] };
  }>(`${graph()}/${postId}?${p}`);
  const impressions =
    json.insights?.data?.find((d) => d.name === "post_impressions")?.values?.[0]?.value ?? 0;
  return {
    impressions,
    likes: json.reactions?.summary?.total_count ?? 0,
    comments: json.comments?.summary?.total_count ?? 0,
    shares: json.shares?.count ?? 0,
  };
}

/** Create an image media container. Carousel items pass isCarouselItem and no caption. */
export async function createImageContainer(
  igUserId: string,
  token: string,
  imageUrl: string,
  caption: string,
  isCarouselItem = false,
): Promise<string> {
  const params: Record<string, string> = { image_url: imageUrl, access_token: token };
  if (isCarouselItem) params.is_carousel_item = "true";
  else if (caption) params.caption = caption;
  const json = await graphJson<{ id?: string }>(`${graph()}/${igUserId}/media`, form(params));
  if (!json.id) throw new Error("Instagram media container creation returned no id.");
  return json.id;
}

/** Create a Reels/video container from a public video URL. */
export async function createVideoContainer(
  igUserId: string,
  token: string,
  videoUrl: string,
  caption: string,
): Promise<string> {
  const json = await graphJson<{ id?: string }>(
    `${graph()}/${igUserId}/media`,
    form({ media_type: "REELS", video_url: videoUrl, caption, access_token: token }),
  );
  if (!json.id) throw new Error("Instagram video container creation returned no id.");
  return json.id;
}

/** Create a carousel parent container from already-created child container ids. */
export async function createCarouselContainer(
  igUserId: string,
  token: string,
  childIds: string[],
  caption: string,
): Promise<string> {
  const json = await graphJson<{ id?: string }>(
    `${graph()}/${igUserId}/media`,
    form({ media_type: "CAROUSEL", children: childIds.join(","), caption, access_token: token }),
  );
  if (!json.id) throw new Error("Instagram carousel container creation returned no id.");
  return json.id;
}

/** Publish a finished container. Returns the published media id. */
export async function publishContainer(
  igUserId: string,
  token: string,
  creationId: string,
): Promise<string> {
  const json = await graphJson<{ id?: string }>(
    `${graph()}/${igUserId}/media_publish`,
    form({ creation_id: creationId, access_token: token }),
  );
  if (!json.id) throw new Error("Instagram publish returned no media id.");
  return json.id;
}

/** Instagram media insights (normalized). Free via the Graph API. */
export async function getMediaInsights(
  accessToken: string,
  mediaId: string,
): Promise<Record<string, number>> {
  const p = new URLSearchParams({
    metric: "reach,likes,comments,saved,shares",
    access_token: accessToken,
  });
  const json = await graphJson<{ data?: { name: string; values?: { value?: number }[] }[] }>(
    `${graph()}/${mediaId}/insights?${p}`,
  );
  const by: Record<string, number> = {};
  for (const d of json.data ?? []) by[d.name] = d.values?.[0]?.value ?? 0;
  return {
    impressions: by.reach ?? 0,
    likes: by.likes ?? 0,
    comments: by.comments ?? 0,
    saves: by.saved ?? 0,
    shares: by.shares ?? 0,
  };
}

/** Poll a container until it's FINISHED (needed for video; images are usually instant). */
export async function waitForContainer(
  token: string,
  creationId: string,
  { tries = 20, delayMs = 3000 }: { tries?: number; delayMs?: number } = {},
): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const json = await graphJson<{ status_code?: string; status?: string }>(
      `${graph()}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
    );
    const code = json.status_code;
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`Instagram media processing ${code.toLowerCase()}: ${json.status ?? ""}`.trim());
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Instagram media didn't finish processing in time.");
}
