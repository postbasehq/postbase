import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Minimal OAuth 2.1 authorization server for the hosted MCP connector.
 * Public clients only (PKCE required, no client secret). Codes are single-use
 * and short-lived; tokens are stored as hashes and resolve to an org.
 */

export const CODE_TTL_SECONDS = 60; // authorization codes are exchanged immediately
export const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const MCP_SCOPE = "mcp";

/** The public origin of this deployment (the OAuth issuer + resource base). */
export function issuer(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

export function mcpResourceUrl(): string {
  return `${issuer()}/api/mcp`;
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
  const redirectUris = Array.isArray(data.redirect_uris)
    ? (data.redirect_uris as string[])
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
  const hash = sha256(code);
  const { data } = await db
    .from("oauth_codes")
    .select("*")
    .eq("code_hash", hash)
    .maybeSingle();
  if (!data) return null;
  await db.from("oauth_codes").delete().eq("code_hash", hash);
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
    .select("id, client_id, org_id, user_id, scope")
    .eq("refresh_token_hash", sha256(refreshToken))
    .maybeSingle();
  if (!data || data.client_id !== clientId) return null;
  await db.from("oauth_tokens").delete().eq("id", data.id);
  return issueTokens({
    clientId: data.client_id as string,
    orgId: data.org_id as string,
    userId: data.user_id as string,
    scope: (data.scope as string) ?? MCP_SCOPE,
  });
}

/** Resolve a bearer access token to its org, or null. Bumps last_used_at. */
export async function resolveAccessToken(token: string): Promise<{ orgId: string } | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("oauth_tokens")
    .select("id, org_id, expires_at")
    .eq("access_token_hash", sha256(token))
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
  void db
    .from("oauth_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return { orgId: data.org_id as string };
}
