import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lightweight, session-authed list of the current workspace's connected
// platforms. Used by the onboarding wizard to reflect connects made in a popup.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ platforms: [] }, { status: 401 });

  const { data } = await supabase.from("channels").select("platform");
  const platforms = Array.from(new Set((data ?? []).map((c) => c.platform)));
  return NextResponse.json({ platforms });
}
