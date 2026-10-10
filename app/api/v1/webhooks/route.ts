import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest } from "@/lib/api-limits";
import { createEndpoint, listEndpoints } from "@/lib/webhooks";
import { errorResponse, jsonBody } from "@/lib/api-input";

/** The workspace's webhook endpoints, with each one's latest delivery. */
export async function GET(req: Request) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ webhooks: await listEndpoints(auth.orgId) });
}

/** Register an endpoint. The signing secret is in this response only. */
export async function POST(req: Request) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const payload = await jsonBody(req);
  if (!payload || typeof payload.url !== "string" || !Array.isArray(payload.events)) {
    return NextResponse.json({ error: "Send a JSON body with url and events", code: "bad_request" }, { status: 400 });
  }
  try {
    const { endpoint, secret } = await createEndpoint(auth.orgId, {
      url: payload.url,
      events: payload.events.filter((e): e is string => typeof e === "string"),
      description: typeof payload.description === "string" ? payload.description : null,
    });
    return NextResponse.json({ webhook: { ...endpoint, secret } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
