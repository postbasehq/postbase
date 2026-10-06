import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest } from "@/lib/api-limits";
import { cancelPost } from "@/lib/api-core";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const outcome = await cancelPost(auth.orgId, id);
  if (!outcome.ok) {
    return outcome.reason === "published"
      ? NextResponse.json({ error: "Post already published" }, { status: 409 })
      : NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // still_sending: channels already mid-send when it was cancelled; they finish.
  return NextResponse.json({ ok: true, id, still_sending: outcome.stillSending });
}
