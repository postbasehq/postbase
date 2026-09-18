import { NextResponse } from "next/server";
import { issuer, mcpResourceUrl } from "@/lib/oauth";

// RFC 9728 — OAuth 2.0 Protected Resource Metadata. Tells MCP clients which
// authorization server guards the MCP endpoint. Served for both the bare path
// and any resource-suffixed path (…/oauth-protected-resource/api/mcp).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export function GET() {
  return NextResponse.json(
    {
      resource: mcpResourceUrl(),
      authorization_servers: [issuer()],
      scopes_supported: ["mcp"],
      bearer_methods_supported: ["header"],
    },
    { headers: cors },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
