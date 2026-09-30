import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest } from "@/lib/api-limits";
import { cancelPost } from "@/lib/api-core";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const cancelled = await cancelPost(auth.orgId, id);
  if (!cancelled) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  return NextResponse.json({ ok: true, id });
}
