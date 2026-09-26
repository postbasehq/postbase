import { NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/publish/run";
import { refreshMetrics } from "@/lib/analytics/collect";

export const dynamic = "force-dynamic";
// Headroom for slow uploads + processing polls (TikTok, Instagram, YouTube). The
// runner stops claiming new targets well before this (START_BUDGET_MS).
export const maxDuration = 300;

/**
 * Cron poller — publishes posts whose scheduled time has passed.
 * Vercel Cron calls this every minute (see vercel.json) with the CRON_SECRET as a
 * bearer token. In local dev (no CRON_SECRET set) it's open so you can poke it;
 * in production a missing secret fails closed.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { processed } = await publishDuePosts();
  // Refresh engagement metrics for recently published posts (bounded internally).
  let refreshed = 0;
  try {
    ({ refreshed } = await refreshMetrics());
  } catch {
    // Metrics are best-effort; never fail the publish cron over them.
  }
  return NextResponse.json({ ok: true, processed, refreshed });
}
