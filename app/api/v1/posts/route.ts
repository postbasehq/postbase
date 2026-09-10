import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { createPost, listPosts } from "@/lib/api-core";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  const posts = await listPosts(auth.orgId, status);
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: {
    body?: string;
    channel_ids?: string[];
    scheduled_at?: string | null;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const post = await createPost(auth.orgId, {
      body: payload.body ?? "",
      channelIds: Array.isArray(payload.channel_ids) ? payload.channel_ids : [],
      scheduledAt: payload.scheduled_at ?? null,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bad request" },
      { status: 400 },
    );
  }
}
