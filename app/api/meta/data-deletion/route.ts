import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { parseSignedRequest } from "@/lib/platforms/meta";
import { readSignedRequest, deleteMetaChannelsForUser } from "@/lib/meta-callback";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Meta Data Deletion Request callback (GDPR). Verify Meta's signed_request,
 * delete the user's channels, and return a status URL + confirmation code as
 * Meta requires. Required by Meta App Review.
 */
export async function POST(req: Request) {
  const signed = await readSignedRequest(req);
  const parsed = signed ? parseSignedRequest(signed) : null;
  if (!parsed?.user_id) {
    return NextResponse.json({ error: "invalid_signed_request" }, { status: 400 });
  }

  await deleteMetaChannelsForUser(parsed.user_id);
  const confirmationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  return NextResponse.json({
    url: `${APP_URL}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
