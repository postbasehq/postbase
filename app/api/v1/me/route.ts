import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest } from "@/lib/api-limits";
import { getMe } from "@/lib/api-core";

/** Which workspace this key acts for: a quick way to check a key works. */
export async function GET(req: Request) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getMe(auth.orgId));
}
