import { NextResponse } from "next/server";
import { registerClient } from "@/lib/oauth";

// RFC 7591 — Dynamic Client Registration. MCP clients register themselves to
// obtain a client_id before starting the authorization-code + PKCE flow.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function isHttpsOrLocal(u: string): boolean {
  try {
    const url = new URL(u);
    return (
      url.protocol === "https:" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      // Native clients use custom schemes / loopback for the redirect.
      url.protocol.endsWith(":")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let body: { client_name?: string; redirect_uris?: unknown; token_endpoint_auth_method?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Body must be JSON." },
      { status: 400, headers: cors },
    );
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (redirectUris.length === 0 || !redirectUris.every(isHttpsOrLocal)) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: "One or more redirect_uris are required and must be https or loopback.",
      },
      { status: 400, headers: cors },
    );
  }

  const { client_id } = await registerClient({
    client_name: typeof body.client_name === "string" ? body.client_name : undefined,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
  });

  return NextResponse.json(
    {
      client_id,
      client_name: body.client_name ?? undefined,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201, headers: cors },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
