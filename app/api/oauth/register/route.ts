import { NextResponse } from "next/server";
import { isSafeRedirectUri, registerClient } from "@/lib/oauth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

// RFC 7591 — Dynamic Client Registration. MCP clients register themselves to
// obtain a client_id before starting the authorization-code + PKCE flow.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function POST(req: Request) {
  // Each registration stores a client row: cap it per caller so a script can't
  // flood the table. Real MCP clients register once per connection. Fails open
  // so a limiter outage never blocks people connecting their assistant.
  if (!(await rateLimit(`oauth-register:${clientKey(req)}`, 60 * 60, 30, { failOpen: true }))) {
    return NextResponse.json(
      { error: "slow_down", error_description: "Too many registrations. Try again later." },
      { status: 429, headers: { ...cors, "Retry-After": "3600" } },
    );
  }
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
  if (
    redirectUris.length === 0 ||
    redirectUris.length > 10 ||
    !redirectUris.every((u) => u.length <= 2048 && isSafeRedirectUri(u))
  ) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description:
          "Between 1 and 10 redirect_uris are required: https, http on loopback, or a native app scheme.",
      },
      { status: 400, headers: cors },
    );
  }

  const { client_id } = await registerClient({
    client_name: typeof body.client_name === "string" ? body.client_name.slice(0, 100) : undefined,
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
