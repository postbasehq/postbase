import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildExport } from "@/lib/account/export";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Download everything Postbase holds for the signed-in person, as JSON. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // A full export reads a lot; a few an hour is plenty.
  if (!(await rateLimit(`export:${user.id}`, 60 * 60, 5))) {
    return NextResponse.json({ error: "Too many exports. Try again in an hour." }, { status: 429 });
  }

  const data = await buildExport(user);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="postbase-export-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
