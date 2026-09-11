import crypto from "node:crypto";

/**
 * X (Twitter) OAuth 2.0 (PKCE, confidential client) + posting helpers.
 * Requires X_CLIENT_ID, X_CLIENT_SECRET, X_CALLBACK_URL.
 */

const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const API = "https://api.twitter.com/2";
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

export type XTokens = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export function xConfigured(): boolean {
  return Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET && process.env.X_CALLBACK_URL);
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createPkce() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function authorizeUrl(state: string, challenge: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: process.env.X_CALLBACK_URL!,
    scope: SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${p.toString()}`;
}

function basicAuth(): string {
  const creds = `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`;
  return "Basic " + Buffer.from(creds).toString("base64");
}

async function tokenRequest(body: URLSearchParams): Promise<XTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as XTokens & { error?: string; error_description?: string };
  if (!res.ok) throw new Error(json.error_description ?? json.error ?? `X token error ${res.status}`);
  return json;
}

export function exchangeCode(code: string, verifier: string): Promise<XTokens> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.X_CALLBACK_URL!,
      code_verifier: verifier,
      client_id: process.env.X_CLIENT_ID!,
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<XTokens> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.X_CLIENT_ID!,
    }),
  );
}

export async function getMe(accessToken: string): Promise<{ id: string; username: string; name: string }> {
  const res = await fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as { data?: { id: string; username: string; name: string }; detail?: string };
  if (!res.ok || !json.data) throw new Error(json.detail ?? `X users/me error ${res.status}`);
  return json.data;
}

export async function postTweet(accessToken: string, text: string): Promise<{ id: string }> {
  const res = await fetch(`${API}/tweets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const json = (await res.json()) as { data?: { id: string }; detail?: string; title?: string };
  if (!res.ok || !json.data) throw new Error(json.detail ?? json.title ?? `X post error ${res.status}`);
  return { id: json.data.id };
}
