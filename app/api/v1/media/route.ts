import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest, mediaImportLimit, tooManyRequests } from "@/lib/api-limits";
import { importMedia, listMedia } from "@/lib/api-core";
import { errorResponse, jsonBody } from "@/lib/api-input";

// The file is fetched during the request.
export const maxDuration = 60;

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

/** Add a file to the media library from a public https URL. */
export async function POST(req: Request) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const payload = await jsonBody(req);
  if (!payload || typeof payload.url !== "string") {
    return NextResponse.json({ error: "Send a JSON body with the file's url", code: "bad_request" }, { status: 400 });
  }
  const hit = await mediaImportLimit(auth.orgId, 1);
  if (hit) return tooManyRequests(hit);
  try {
    const media = await importMedia(auth.orgId, payload.url, typeof payload.name === "string" ? payload.name : undefined);
    return NextResponse.json({ media }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
