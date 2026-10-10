import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest, mediaImportLimit, postLimit, tooManyRequests } from "@/lib/api-limits";
import { createPost, listPosts } from "@/lib/api-core";
import { errorResponse, jsonBody, postFieldsFrom } from "@/lib/api-input";

// media_urls are fetched during the request.
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;

  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  const posts = await listPosts(auth.orgId, status);
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;

  const payload = await jsonBody(req);
  if (!payload) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const hit = await postLimit(auth.orgId);
  if (hit) return tooManyRequests(hit);
  const fields = postFieldsFrom(payload);
  const mediaHit = await mediaImportLimit(auth.orgId, fields.mediaUrls?.length ?? 0);
  if (mediaHit) return tooManyRequests(mediaHit);

  try {
    const post = await createPost(auth.orgId, {
      ...fields,
      channelIds: fields.channelIds ?? [],
      scheduledAt: fields.scheduledAt ?? null,
      // The header (the usual convention) or a body field.
      idempotencyKey: req.headers.get("idempotency-key") ?? (payload.idempotency_key as string | undefined),
    });
    // A repeat of an earlier request (same idempotency key) returns that post with 200.
    return NextResponse.json({ post }, { status: "idempotent_replay" in post ? 200 : 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
