import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeUrl, linkedinConfigured } from "@/lib/platforms/linkedin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };

// Start the LinkedIn OAuth flow.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  if (!linkedinConfigured()) {
    return NextResponse.redirect(`${APP_URL}/channels?error=li_not_configured`);
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("li_oauth_state", state, cookieOpts);
  return res;
}
