import { NextResponse } from "next/server";
import { parseSignedRequest } from "@/lib/platforms/meta";
import { readSignedRequest, deleteMetaChannelsForUser } from "@/lib/meta-callback";

export const runtime = "nodejs";

/**
 * Meta Deauthorize callback — called when a user removes the Postbase app from
 * their Facebook/Instagram account. We verify Meta's signed_request and delete
 * the channels linked to that user. Required by Meta App Review.
 */
export async function POST(req: Request) {
  const signed = await readSignedRequest(req);
  const parsed = signed ? parseSignedRequest(signed) : null;
  if (!parsed?.user_id) {
    return NextResponse.json({ error: "invalid_signed_request" }, { status: 400 });
  }
  await deleteMetaChannelsForUser(parsed.user_id);
  return NextResponse.json({ ok: true });
}
