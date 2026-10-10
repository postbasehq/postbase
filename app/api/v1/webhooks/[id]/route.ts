import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest } from "@/lib/api-limits";
import { deleteEndpoint, getEndpoint, listDeliveries } from "@/lib/webhooks";

type Params = { params: Promise<{ id: string }> };

/** An endpoint's recent deliveries (newest first). */
export async function GET(req: Request, { params }: Params) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const endpoint = await getEndpoint(auth.orgId, id);
  if (!endpoint) return NextResponse.json({ error: "Webhook not found", code: "not_found" }, { status: 404 });
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 20);
  return NextResponse.json({
    webhook: { id: endpoint.id, url: endpoint.url, events: endpoint.events },
    deliveries: await listDeliveries(auth.orgId, id, Number.isFinite(limit) ? limit : 20),
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!(await deleteEndpoint(auth.orgId, id))) {
    return NextResponse.json({ error: "Webhook not found", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id });
}
