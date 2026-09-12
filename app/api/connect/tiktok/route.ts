import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeUrl, createPkce, tiktokConfigured } from "@/lib/platforms/tiktok";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };

// Start the TikTok OAuth flow.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  if (!tiktokConfigured()) {
    return NextResponse.redirect(`${APP_URL}/channels?error=tt_not_configured`);
  }

  const state = crypto.randomUUID();
  const { verifier, challenge } = createPkce();
  const res = NextResponse.redirect(authorizeUrl(state, challenge));
  res.cookies.set("tt_oauth_state", state, cookieOpts);
  res.cookies.set("tt_oauth_verifier", verifier, cookieOpts);
  return res;
}
