import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { encryptJson } from "@/lib/crypto";
import { exchangeCode, getMe } from "@/lib/platforms/x";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// X OAuth callback: exchange the code, store the channel with encrypted tokens.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const savedState = jar.get("x_oauth_state")?.value;
  const verifier = jar.get("x_oauth_verifier")?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${APP_URL}/channels?error=${reason}`);
    res.cookies.delete("x_oauth_state");
    res.cookies.delete("x_oauth_verifier");
    return res;
  };

  if (!code || !state || !verifier || state !== savedState) return fail("oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  const orgId = await getCurrentOrgId();
  if (!orgId) return fail("no_workspace");

  try {
    const tokens = await exchangeCode(code, verifier);
    const me = await getMe(tokens.access_token);
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error } = await supabase.from("channels").insert({
      org_id: orgId,
      platform: "x",
      handle: `@${me.username}`,
      encrypted_tokens: encryptJson(tokens),
      token_expiry: tokenExpiry,
      status: "active",
    });
    if (error) return fail("save_failed");
  } catch {
    return fail("x_connect_failed");
  }

  const res = NextResponse.redirect(`${APP_URL}/channels?connected=x`);
  res.cookies.delete("x_oauth_state");
  res.cookies.delete("x_oauth_verifier");
  return res;
}
