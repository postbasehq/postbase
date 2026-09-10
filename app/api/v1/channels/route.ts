import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { listChannels } from "@/lib/api-core";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const channels = await listChannels(auth.orgId);
  return NextResponse.json({ channels });
}
