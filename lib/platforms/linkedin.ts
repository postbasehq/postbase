/**
 * LinkedIn OAuth 2.0 + posting via the versioned Posts API (member posts).
 *
 * The app needs the "Sign In with LinkedIn using OpenID Connect" and
 * "Share on LinkedIn" products. Scopes: openid + profile (to read the member's
 * id from /v2/userinfo) and w_member_social (to post on their behalf).
 *
 * Requires LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_CALLBACK_URL
 * (+ optional LINKEDIN_API_VERSION, default 202509).
 */

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const API = "https://api.linkedin.com";
const SCOPES = ["openid", "profile", "w_member_social"];

function apiVersion(): string {
  return process.env.LINKEDIN_API_VERSION ?? "202509";
}

export type LinkedInTokens = {
  access_token: string;
  refresh_token?: string;
  author_urn: string; // urn:li:person:{sub}
  name?: string;
};

export function linkedinConfigured(): boolean {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID &&
      process.env.LINKEDIN_CLIENT_SECRET &&
      process.env.LINKEDIN_CALLBACK_URL,
  );
}

export function authorizeUrl(state: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: process.env.LINKEDIN_CALLBACK_URL!,
    scope: SCOPES.join(" "),
    state,
  });
  return `${AUTHORIZE_URL}?${p.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `LinkedIn token error ${res.status}`);
  }
  return json;
}

export function exchangeCode(code: string): Promise<TokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.LINKEDIN_CALLBACK_URL!,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  );
}

/** OpenID Connect userinfo — the `sub` is the member id used to build the author URN. */
export async function getMe(
  accessToken: string,
): Promise<{ sub: string; name?: string; picture?: string }> {
  const res = await fetch(`${API}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as { sub?: string; name?: string; picture?: string; message?: string };
  if (!res.ok || !json.sub) throw new Error(json.message ?? `LinkedIn userinfo error ${res.status}`);
  return { sub: json.sub, name: json.name, picture: json.picture };
}

function restHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": apiVersion(),
  };
}

/** Upload an image via the Images API (initialize -> PUT bytes). Returns urn:li:image:xxx. */
export async function uploadImage(
  accessToken: string,
  ownerUrn: string,
  bytes: ArrayBuffer,
): Promise<string> {
  const initRes = await fetch(`${API}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers: restHeaders(accessToken),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });
  const initJson = (await initRes.json()) as {
    value?: { uploadUrl?: string; image?: string };
    message?: string;
  };
  if (!initRes.ok || !initJson.value?.uploadUrl || !initJson.value.image) {
    throw new Error(initJson.message ?? `LinkedIn image init error ${initRes.status}`);
  }

  const putRes = await fetch(initJson.value.uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: bytes,
  });
  if (!putRes.ok) throw new Error(`LinkedIn image upload failed (${putRes.status}).`);
  return initJson.value.image;
}

/**
 * LinkedIn commentary uses a "little text" format where these characters are
 * reserved. Escape them so arbitrary user text posts literally (hashtags/mentions
 * render as plain text rather than erroring the request).
 */
export function escapeCommentary(text: string): string {
  return text.replace(/[\\<>#~@|{}[\]()*_]/g, (c) => `\\${c}`);
}

/**
 * Engagement counts for a post (likes + comments). LinkedIn doesn't expose member-post
 * impressions via API, so those stay unavailable. Best-effort — degrades on error.
 */
export async function getSocialActions(
  accessToken: string,
  shareUrn: string,
): Promise<Record<string, number>> {
  const res = await fetch(`${API}/v2/socialActions/${encodeURIComponent(shareUrn)}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "X-Restli-Protocol-Version": "2.0.0" },
  });
  const json = (await res.json()) as {
    likesSummary?: { totalLikes?: number };
    commentsSummary?: { aggregatedTotalComments?: number };
    message?: string;
  };
  if (!res.ok) throw new Error(json.message ?? `LinkedIn socialActions error ${res.status}`);
  return {
    likes: json.likesSummary?.totalLikes ?? 0,
    comments: json.commentsSummary?.aggregatedTotalComments ?? 0,
  };
}

/**
 * Post a comment on an existing share/post — powers the "first comment" feature.
 * Uses the same `w_member_social` scope as publishing, so no extra grant is
 * needed. Callers treat this as best-effort (a failed comment must not fail the
 * post it belongs to).
 */
export async function postComment(
  accessToken: string,
  authorUrn: string,
  shareUrn: string,
  text: string,
): Promise<void> {
  const res = await fetch(`${API}/v2/socialActions/${encodeURIComponent(shareUrn)}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({ actor: authorUrn, message: { text } }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `LinkedIn comment error ${res.status}`);
  }
}

/** Create a member post (text, single image, or multi-image). Returns the post URN. */
export async function createPost(
  accessToken: string,
  authorUrn: string,
  commentary: string,
  imageUrns: string[],
): Promise<string> {
  const body: Record<string, unknown> = {
    author: authorUrn,
    commentary: escapeCommentary(commentary),
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  if (imageUrns.length === 1) {
    body.content = { media: { id: imageUrns[0] } };
  } else if (imageUrns.length > 1) {
    body.content = { multiImage: { images: imageUrns.map((id) => ({ id })) } };
  }

  const res = await fetch(`${API}/rest/posts`, {
    method: "POST",
    headers: restHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `LinkedIn post error ${res.status}`);
  }
  // The created post URN comes back in a response header, not the body.
  return res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id") ?? "";
}
