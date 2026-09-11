import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeUrl, createPkce, xConfigured } from "@/lib/platforms/x";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };

// Start the X OAuth 2.0 (PKCE) connect flow.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  if (!xConfigured()) {
    return NextResponse.redirect(`${APP_URL}/channels?error=x_not_configured`);
  }

  const { verifier, challenge } = createPkce();
  const state = crypto.randomUUID();

  const res = NextResponse.redirect(authorizeUrl(state, challenge));
  res.cookies.set("x_oauth_verifier", verifier, cookieOpts);
  res.cookies.set("x_oauth_state", state, cookieOpts);
  return res;
}
