import { NextResponse } from "next/server";
import { issuer } from "@/lib/oauth";

// RFC 8414 — OAuth 2.0 Authorization Server Metadata. Served at the domain root
// via a rewrite from /.well-known/oauth-authorization-server.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export function GET() {
  const base = issuer();
  return NextResponse.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["mcp"],
    },
    { headers: cors },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
