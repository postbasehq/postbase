import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Minimal OAuth 2.1 authorization server for the hosted MCP connector.
 * Public clients only (PKCE required, no client secret). Codes are single-use
 * and short-lived; tokens are stored as hashes and resolve to an org.
 */

export const CODE_TTL_SECONDS = 60; // authorization codes are exchanged immediately
export const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
// A refresh token is good for 90 days from its last rotation: a client that
// keeps refreshing stays connected; one idle for 90 days has to re-authorize.
export const REFRESH_IDLE_SECONDS = 60 * 60 * 24 * 90;
export const MCP_SCOPE = "mcp";

/** The public origin of this deployment (the OAuth issuer + resource base). */
export function issuer(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

export function mcpResourceUrl(): string {
  return `${issuer()}/api/mcp`;
}

/**
 * The MCP server also answers at its own host, https://mcp.postbase.so/mcp
 * (rewritten to /api/mcp in next.config). A client's resource must match the
 * URL it connected to, so metadata is host-aware. The authorization server
 * stays on the main origin either way.
 */
export const MCP_HOST = process.env.MCP_HOST || "mcp.postbase.so";

function requestHost(req: Request): string {
  return (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
}

export function isMcpHost(req: Request): boolean {
  return requestHost(req) === MCP_HOST;
}

/**
 * The MCP URL to show people (Developers page, docs): the dedicated host in
 * production, the app's own /api/mcp anywhere else (local dev, previews).
 */
export function publicMcpUrl(): string {
  return /(^|\.)postbase\.so$/.test(new URL(issuer()).hostname) ? `https://${MCP_HOST}/mcp` : mcpResourceUrl();
}

/** The MCP resource URL for the host this request came in on. */
export function mcpResourceUrlFor(req: Request): string {
  return isMcpHost(req) ? `https://${MCP_HOST}/mcp` : mcpResourceUrl();
}

/** Where this host serves its protected-resource metadata. */
export function resourceMetadataUrlFor(req: Request): string {
  return isMcpHost(req) ? `https://${MCP_HOST}/.well-known/oauth-protected-resource` : `${issuer()}/.well-known/oauth-protected-resource`;
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** base64url(sha256(x)) — the PKCE S256 transform. */
function b64urlSha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("base64url");
}

export function verifyPkce(
  verifier: string,
  challenge: string,
  method = "S256",
): boolean {
  if (!verifier || !challenge) return false;
  if (method === "plain") {
    // OAuth 2.1 discourages plain; support only if a client insists.
    return crypto.timingSafeEqual(Buffer.from(verifier), Buffer.from(challenge));
  }
  const computed = b64urlSha256(verifier);
  if (computed.length !== challenge.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(challenge));
}

function randomToken(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(32).toString("base64url")}`;
}

// ── Dynamic client registration ────────────────────────────────────────────
// Schemes a browser would execute or load in our origin rather than hand off
// to a native app. A redirect to one of these from the consent page is XSS.
const BLOCKED_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "about:",
  "filesystem:",
  "view-source:",
  "ftp:",
  "ws:",
  "wss:",
]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Whether a client may use this redirect_uri (RFC 8252 shapes): https anywhere,
 * http only on loopback, or a native app's private-use scheme (cursor://…,
 * com.example.app:/…). Checked at registration and again before every redirect.
 */
export function isSafeRedirectUri(u: string): boolean {
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return false;
  }
  const scheme = url.protocol.toLowerCase();
  if (scheme === "https:") return true;
  if (scheme === "http:") return LOOPBACK_HOSTS.has(url.hostname);
  if (BLOCKED_SCHEMES.has(scheme)) return false;
  return /^[a-z][a-z0-9+.-]*:$/.test(scheme);
}

export async function registerClient(input: {
  client_name?: string;
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
}): Promise<{ client_id: string }> {
  const db = createAdminClient();
  const client_id = `mcpc_${crypto.randomBytes(16).toString("hex")}`;
  const { error } = await db.from("oauth_clients").insert({
    client_id,
    client_name: input.client_name ?? null,
    redirect_uris: input.redirect_uris,
    token_endpoint_auth_method: input.token_endpoint_auth_method ?? "none",
  });
  if (error) throw new Error(error.message);
  return { client_id };
}

export async function getClient(clientId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("oauth_clients")
    .select("client_id, client_name, redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();
  if (!data) return null;
  // Drop anything unsafe even if it got stored, so it can never be matched.
  const redirectUris = Array.isArray(data.redirect_uris)
    ? (data.redirect_uris as unknown[]).filter((u): u is string => typeof u === "string" && isSafeRedirectUri(u))
    : [];
  return { clientId: data.client_id, name: data.client_name as string | null, redirectUris };
}

// ── Authorization codes ─────────────────────────────────────────────────────
export async function issueCode(input: {
  clientId: string;
  orgId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope?: string;
  resource?: string;
}): Promise<string> {
  const db = createAdminClient();
  const code = randomToken("mcpa");
  const expires = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();
  const { error } = await db.from("oauth_codes").insert({
    code_hash: sha256(code),
    client_id: input.clientId,
    org_id: input.orgId,
    user_id: input.userId,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod,
    scope: input.scope ?? MCP_SCOPE,
    resource: input.resource ?? null,
    expires_at: expires,
  });
  if (error) throw new Error(error.message);
  return code;
}

/** Consume a code (single-use): returns its record and deletes it, or null. */
export async function consumeCode(code: string) {
  const db = createAdminClient();
  // Delete-and-return in one statement, so two concurrent exchanges of the same
  // code can't both get it.
  const { data } = await db
    .from("oauth_codes")
    .delete()
    .eq("code_hash", sha256(code))
    .select("*")
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return data as {
    client_id: string;
    org_id: string;
    user_id: string;
    redirect_uri: string;
    code_challenge: string;
    code_challenge_method: string;
    scope: string | null;
    resource: string | null;
  };
}

// ── Tokens ──────────────────────────────────────────────────────────────────
/**
 * Whether the user who authorized a token is still in its workspace. Tokens act
 * as the workspace, so someone removed from the team must lose access at once.
 * Null when the lookup itself failed (callers deny, but never revoke, on null).
 */
async function stillMember(
  db: ReturnType<typeof createAdminClient>,
  orgId: string,
  userId: string,
): Promise<boolean | null> {
  const { data, error } = await db
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return Boolean(data);
}

export async function issueTokens(input: {
  clientId: string;
  orgId: string;
  userId: string;
  scope?: string;
}): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const db = createAdminClient();
  const access = randomToken("pbt");
  const refresh = randomToken("pbr");
  const expires = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000).toISOString();
  const { error } = await db.from("oauth_tokens").insert({
    access_token_hash: sha256(access),
    refresh_token_hash: sha256(refresh),
    client_id: input.clientId,
    org_id: input.orgId,
    user_id: input.userId,
    scope: input.scope ?? MCP_SCOPE,
    expires_at: expires,
  });
  if (error) throw new Error(error.message);
  return { access_token: access, refresh_token: refresh, expires_in: ACCESS_TTL_SECONDS };
}

/** Rotate a refresh token into a fresh access/refresh pair. */
export async function refreshTokens(refreshToken: string, clientId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("oauth_tokens")
    .select("id, client_id, org_id, user_id, scope, created_at")
    .eq("refresh_token_hash", sha256(refreshToken))
    .maybeSingle();
  if (!data || data.client_id !== clientId) return null;
  // created_at is the last rotation (each refresh inserts a fresh row).
  const idle = Date.now() - new Date(data.created_at as string).getTime() > REFRESH_IDLE_SECONDS * 1000;
  const member = await stillMember(db, data.org_id as string, data.user_id as string);
  if (member === null) return null;
  // Single-use: the presented row goes either way (rotated, expired or revoked).
  // Only the request that actually deletes it gets a new pair, so two concurrent
  // refreshes with the same token can't both succeed.
  const { data: consumed } = await db.from("oauth_tokens").delete().eq("id", data.id).select("id");
  if (!consumed?.length || idle || !member) return null;
  return issueTokens({
    clientId: data.client_id as string,
    orgId: data.org_id as string,
    userId: data.user_id as string,
    scope: (data.scope as string) ?? MCP_SCOPE,
  });
}

/** Apps the given user has authorized (one row per live OAuth token). */
export async function listConnectedApps(userId: string) {
  const db = createAdminClient();
  const { data: tokens } = await db
    .from("oauth_tokens")
    .select("id, client_id, org_id, created_at, last_used_at, expires_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const rows = tokens ?? [];
  if (rows.length === 0) return [];

  // No FK constraints between these tables, so resolve names with two lookups.
  const clientIds = [...new Set(rows.map((r) => r.client_id as string))];
  const orgIds = [...new Set(rows.map((r) => r.org_id as string))];
  const [{ data: clients }, { data: orgs }] = await Promise.all([
    db.from("oauth_clients").select("client_id, client_name").in("client_id", clientIds),
    db.from("orgs").select("id, name").in("id", orgIds),
  ]);
  const nameByClient = new Map((clients ?? []).map((c) => [c.client_id, c.client_name]));
  const nameByOrg = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return rows.map((r) => ({
    id: r.id as string,
    appName: (nameByClient.get(r.client_id as string) as string) || "Connected app",
    orgId: r.org_id as string,
    orgName: (nameByOrg.get(r.org_id as string) as string) || "—",
    createdAt: r.created_at as string,
    lastUsedAt: (r.last_used_at as string | null) ?? null,
    expiresAt: r.expires_at as string,
  }));
}

/** Revoke a token by id, but only if it belongs to the given user. */
export async function revokeToken(tokenId: string, userId: string): Promise<void> {
  const db = createAdminClient();
  await db.from("oauth_tokens").delete().eq("id", tokenId).eq("user_id", userId);
}

/** Resolve a bearer access token to its org, or null. Bumps last_used_at. */
export async function resolveAccessToken(token: string): Promise<{ orgId: string } | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("oauth_tokens")
    .select("id, org_id, user_id, expires_at")
    .eq("access_token_hash", sha256(token))
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
  if ((await stillMember(db, data.org_id as string, data.user_id as string)) !== true) return null;
  void db
    .from("oauth_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return { orgId: data.org_id as string };
}
