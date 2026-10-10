import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest, mediaImportLimit, tooManyRequests } from "@/lib/api-limits";
import { getPost, updatePost } from "@/lib/api-core";
import { errorResponse, jsonBody, postFieldsFrom } from "@/lib/api-input";

// media_urls are fetched during the request.
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/** One post with each channel's status, live URL and error. */
export async function GET(req: Request, { params }: Params) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    return NextResponse.json({ post: await getPost(auth.orgId, id) });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Edit a draft or scheduled post; fields left out keep their value. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const payload = await jsonBody(req);
  if (!payload) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const fields = postFieldsFrom(payload);
  const mediaHit = await mediaImportLimit(auth.orgId, fields.mediaUrls?.length ?? 0);
  if (mediaHit) return tooManyRequests(mediaHit);

  const { id } = await params;
  try {
    return NextResponse.json({ post: await updatePost(auth.orgId, id, fields) });
  } catch (e) {
    return errorResponse(e);
  }
}
