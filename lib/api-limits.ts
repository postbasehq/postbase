import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/*
 * Limits for the public REST API (/api/v1) and the hosted MCP server, counted
 * per workspace across both. Generous for any real client or script; they stop
 * runaway loops and cap what a leaked key could cost (X bills per post).
 * The limiter fails open here: a database hiccup shouldn't take the API down.
 */
export const API_LIMITS = {
  /** Requests per minute, per workspace. */
  requestsPerMinute: 120,
  /** Posts created per hour, per workspace (drafts and scheduled). */
  postsPerHour: 60,
  /** Files fetched from URLs per hour, per workspace (media_urls and POST /v1/media). */
  mediaImportsPerHour: 60,
  /** Failed authentications per minute, per IP (slows key guessing). */
  failedAuthPerMinute: 30,
} as const;

export type LimitHit = { retryAfter: number; message: string };

/** Count one request for the workspace; returns the hit if it's over the limit. */
export async function requestLimit(orgId: string): Promise<LimitHit | null> {
  const ok = await rateLimit(`api:req:${orgId}`, 60, API_LIMITS.requestsPerMinute, { failOpen: true });
  return ok
    ? null
    : { retryAfter: 60, message: `Rate limit: ${API_LIMITS.requestsPerMinute} requests a minute per workspace. Try again in a minute.` };
}

/** Count one created post for the workspace; returns the hit if it's over the limit. */
export async function postLimit(orgId: string): Promise<LimitHit | null> {
  const ok = await rateLimit(`api:post:${orgId}`, 3600, API_LIMITS.postsPerHour, { failOpen: true });
  return ok
    ? null
    : {
        retryAfter: 3600,
        message: `Rate limit: ${API_LIMITS.postsPerHour} posts an hour per workspace through the API and AI tools. Try again later, or write posts in the Postbase composer.`,
      };
}

/** Count `n` files fetched from URLs for the workspace; returns the hit if it's over the limit. */
export async function mediaImportLimit(orgId: string, n: number): Promise<LimitHit | null> {
  for (let i = 0; i < n; i++) {
    const ok = await rateLimit(`api:media:${orgId}`, 3600, API_LIMITS.mediaImportsPerHour, { failOpen: true });
    if (!ok) {
      return {
        retryAfter: 3600,
        message: `Rate limit: ${API_LIMITS.mediaImportsPerHour} files from URLs an hour per workspace. Try again later, or upload in the Postbase media library.`,
      };
    }
  }
  return null;
}

/**
 * Count a failed authentication from this IP; true if it's now over the limit.
 * Only requests that sent a credential count: AI tools (Claude, ChatGPT) first
 * call without one to discover sign-in, from servers many customers share, and
 * those calls must never trip the limit.
 */
export async function failedAuthLimited(req: Request): Promise<boolean> {
  if (!/^Bearer\s+\S/i.test(req.headers.get("authorization") ?? "")) return false;
  const ok = await rateLimit(`api:badauth:${clientKey(req)}`, 60, API_LIMITS.failedAuthPerMinute, { failOpen: true });
  return !ok;
}

/** A 429 response in the REST API's JSON shape, with Retry-After. */
export function tooManyRequests(hit: LimitHit, headers: Record<string, string> = {}) {
  return NextResponse.json(
    { error: "rate_limited", message: hit.message, retry_after: hit.retryAfter },
    { status: 429, headers: { ...headers, "Retry-After": String(hit.retryAfter) } },
  );
}

/**
 * Authenticate a REST API request and apply the limits. Returns the workspace,
 * or the response to send (401, or 429 when over a limit).
 */
export async function guardApiRequest(
  req: Request,
  authenticate: (req: Request) => Promise<{ orgId: string } | null>,
): Promise<{ orgId: string } | NextResponse> {
  const auth = await authenticate(req);
  if (!auth) {
    if (await failedAuthLimited(req)) {
      return tooManyRequests({ retryAfter: 60, message: "Too many failed attempts. Try again in a minute." });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const hit = await requestLimit(auth.orgId);
  return hit ? tooManyRequests(hit) : auth;
}
