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
 * META_GRAPH_API_VERSION, default v21.0).
 */

const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

function version(): string {
  return process.env.META_GRAPH_API_VERSION ?? "v21.0";
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

export function authorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_CALLBACK_URL!,
    state,
    scope: SCOPES.join(","),
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
export async function exchangeCode(code: string): Promise<string> {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: process.env.META_CALLBACK_URL!,
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
