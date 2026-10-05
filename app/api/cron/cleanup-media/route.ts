import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/media-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Files nothing references (no post, YouTube thumbnail or agent chat) are kept
// this long, so an upload has time to be attached before it's swept.
const MIN_AGE = "48 hours";
const BATCH = 500;
// Files from before the lockdown (2026-10-05) are left alone until they've been
// reviewed; move this earlier to sweep them too.
const SWEEP_FROM = "2026-10-05T00:00:00Z";

/**
 * Daily sweep of post-media (see vercel.json): deletes uploads that were never
 * used, so the public bucket can't serve as free file hosting. Deletion goes
 * through the Storage API (a plain SQL delete would leave the bytes behind).
 * Pass ?dry=1 to list what would go without deleting. Same CRON_SECRET guard as
 * the publish cron.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("orphan_media", { p_min_age: MIN_AGE, p_limit: BATCH, p_created_after: SWEEP_FROM });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const names = (data ?? []) as string[];

  if (new URL(req.url).searchParams.get("dry") === "1") {
    return NextResponse.json({ wouldDelete: names.length, names });
  }
  if (names.length > 0) {
    const { error: rmError } = await db.storage.from(MEDIA_BUCKET).remove(names);
    if (rmError) return NextResponse.json({ error: rmError.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: names.length });
}
