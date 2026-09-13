import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeUrl, metaConfigured, FACEBOOK_SCOPES } from "@/lib/platforms/meta";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };

// Start the Facebook Page (Facebook Login) OAuth flow.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  if (!metaConfigured()) {
    return NextResponse.redirect(`${APP_URL}/channels?error=fb_not_configured`);
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(
    authorizeUrl(state, {
      redirectUri: process.env.FACEBOOK_CALLBACK_URL,
      scopes: FACEBOOK_SCOPES,
    }),
  );
  res.cookies.set("fb_oauth_state", state, cookieOpts);
  return res;
}
