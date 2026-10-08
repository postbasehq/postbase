import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest, postLimit, tooManyRequests } from "@/lib/api-limits";
import { createPost, listPosts } from "@/lib/api-core";

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

  let payload: {
    body?: string;
    thread?: string[];
    channel_ids?: string[];
    scheduled_at?: string | null;
    media_ids?: string[];
    youtube?: { title?: string; privacy?: string; made_for_kids?: boolean };
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const hit = await postLimit(auth.orgId);
  if (hit) return tooManyRequests(hit);

  try {
    const post = await createPost(auth.orgId, {
      body: payload.body ?? "",
      thread: Array.isArray(payload.thread) ? payload.thread : undefined,
      channelIds: Array.isArray(payload.channel_ids) ? payload.channel_ids : [],
      scheduledAt: payload.scheduled_at ?? null,
      mediaIds: Array.isArray(payload.media_ids) ? payload.media_ids.filter((x) => typeof x === "string") : [],
      youtube:
        payload.youtube && typeof payload.youtube === "object"
          ? {
              title: typeof payload.youtube.title === "string" ? payload.youtube.title : undefined,
              privacy: typeof payload.youtube.privacy === "string" ? payload.youtube.privacy : undefined,
              madeForKids: typeof payload.youtube.made_for_kids === "boolean" ? payload.youtube.made_for_kids : undefined,
            }
          : undefined,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bad request" },
      { status: 400 },
    );
  }
}
