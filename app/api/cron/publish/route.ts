import { NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/publish/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron poller — publishes posts whose scheduled time has passed.
 * Vercel Cron calls this every minute (see vercel.json) with the CRON_SECRET as a
 * bearer token. In local dev (no CRON_SECRET set) it's open so you can poke it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { processed } = await publishDuePosts();
  return NextResponse.json({ ok: true, processed });
}
