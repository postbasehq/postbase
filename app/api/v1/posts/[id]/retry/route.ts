import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest } from "@/lib/api-limits";
import { retryPost } from "@/lib/api-core";
import { errorResponse } from "@/lib/api-input";

/** Send the post's failed channels again; channels that went out are left alone. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    return NextResponse.json(await retryPost(auth.orgId, id), { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
