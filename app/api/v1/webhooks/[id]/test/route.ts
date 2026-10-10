import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest } from "@/lib/api-limits";
import { sendTestEvent } from "@/lib/webhooks";
import { errorResponse } from "@/lib/api-input";

/** Send a webhook.test event to the endpoint now and report the response. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const result = await sendTestEvent(auth.orgId, id);
    if (!result) return NextResponse.json({ error: "Webhook not found", code: "not_found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
