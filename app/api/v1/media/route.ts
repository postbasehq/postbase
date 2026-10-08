import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest } from "@/lib/api-limits";
import { listMedia } from "@/lib/api-core";

/** The workspace's media library, for attaching files to posts by id (media_ids). */
export async function GET(req: Request) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const params = new URL(req.url).searchParams;
  const media = await listMedia(auth.orgId, {
    type: params.get("type") ?? undefined,
    search: params.get("search") ?? undefined,
  });
  return NextResponse.json({ media });
}
