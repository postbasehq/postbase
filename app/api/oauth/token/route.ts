import { NextResponse } from "next/server";
import { consumeCode, issueTokens, refreshTokens, verifyPkce, MCP_SCOPE } from "@/lib/oauth";

// OAuth 2.1 token endpoint: authorization_code (with PKCE) + refresh_token.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-store",
};

const err = (error: string, description: string, status = 400) =>
  NextResponse.json({ error, error_description: description }, { status, headers: cors });

async function readParams(req: Request): Promise<Record<string, string>> {
  const ctype = req.headers.get("content-type") ?? "";
  if (ctype.includes("application/json")) {
    try {
      const j = await req.json();
      return Object.fromEntries(
        Object.entries(j).map(([k, v]) => [k, typeof v === "string" ? v : String(v)]),
      );
    } catch {
      return {};
    }
  }
  const body = await req.text();
  return Object.fromEntries(new URLSearchParams(body));
}

export async function POST(req: Request) {
  const p = await readParams(req);
  const grantType = p.grant_type;

  if (grantType === "authorization_code") {
    const { code, redirect_uri, client_id, code_verifier } = p;
    if (!code || !client_id || !code_verifier) {
      return err("invalid_request", "code, client_id and code_verifier are required.");
    }
    const record = await consumeCode(code);
    if (!record) return err("invalid_grant", "The authorization code is invalid or expired.");
    if (record.client_id !== client_id) return err("invalid_grant", "Client mismatch.");
    if (record.redirect_uri !== redirect_uri) return err("invalid_grant", "redirect_uri mismatch.");
    if (!verifyPkce(code_verifier, record.code_challenge, record.code_challenge_method)) {
      return err("invalid_grant", "PKCE verification failed.");
    }

    const tokens = await issueTokens({
      clientId: record.client_id,
      orgId: record.org_id,
      userId: record.user_id,
      scope: record.scope ?? MCP_SCOPE,
    });
    return NextResponse.json(
      {
        access_token: tokens.access_token,
        token_type: "Bearer",
        expires_in: tokens.expires_in,
        refresh_token: tokens.refresh_token,
        scope: record.scope ?? MCP_SCOPE,
      },
      { headers: cors },
    );
  }

  if (grantType === "refresh_token") {
    const { refresh_token, client_id } = p;
    if (!refresh_token || !client_id) {
      return err("invalid_request", "refresh_token and client_id are required.");
    }
    const tokens = await refreshTokens(refresh_token, client_id);
    if (!tokens) return err("invalid_grant", "The refresh token is invalid.");
    return NextResponse.json(
      {
        access_token: tokens.access_token,
        token_type: "Bearer",
        expires_in: tokens.expires_in,
        refresh_token: tokens.refresh_token,
        scope: MCP_SCOPE,
      },
      { headers: cors },
    );
  }

  return err("unsupported_grant_type", "Use authorization_code or refresh_token.");
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
