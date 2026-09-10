import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { cancelPost } from "@/lib/api-core";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cancelled = await cancelPost(auth.orgId, id);
  if (!cancelled) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  return NextResponse.json({ ok: true, id });
}
