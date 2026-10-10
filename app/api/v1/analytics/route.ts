import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { guardApiRequest } from "@/lib/api-limits";
import { getAnalytics } from "@/lib/analytics/api";
import { errorResponse } from "@/lib/api-input";

/** Published posts in a date range with each channel's latest metrics. */
export async function GET(req: Request) {
  const auth = await guardApiRequest(req, authenticateApiKey);
  if (auth instanceof NextResponse) return auth;
  const p = new URL(req.url).searchParams;
  const num = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined);
  try {
    return NextResponse.json(
      await getAnalytics(auth.orgId, {
        from: p.get("from") ?? undefined,
        to: p.get("to") ?? undefined,
        postId: p.get("post_id") ?? undefined,
        channelId: p.get("channel_id") ?? undefined,
        platform: p.get("platform") ?? undefined,
        sort: p.get("sort") ?? undefined,
        order: p.get("order") ?? undefined,
        limit: num("limit"),
        offset: num("offset"),
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
