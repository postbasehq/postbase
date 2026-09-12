import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { encryptJson } from "@/lib/crypto";
import { exchangeCode, getMe, type LinkedInTokens } from "@/lib/platforms/linkedin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// LinkedIn OAuth callback: exchange the code, read the member id, store the channel.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const savedState = jar.get("li_oauth_state")?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${APP_URL}/channels?error=${reason}`);
    res.cookies.delete("li_oauth_state");
    return res;
  };

  // LinkedIn appends error params when the user declines.
  if (searchParams.get("error")) return fail("li_connect_failed");
  if (!code || !state || state !== savedState) return fail("oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  const orgId = await getCurrentOrgId();
  if (!orgId) return fail("no_workspace");

  try {
    const token = await exchangeCode(code);
    const me = await getMe(token.access_token!);

    const tokens: LinkedInTokens = {
      access_token: token.access_token!,
      refresh_token: token.refresh_token,
      author_urn: `urn:li:person:${me.sub}`,
      name: me.name,
    };
    const handle = me.name ?? "LinkedIn";
    const tokenExpiry = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const fields = {
      encrypted_tokens: encryptJson(tokens),
      token_expiry: tokenExpiry,
      status: "active",
    };

    // Reconnecting the same member updates the existing channel instead of duplicating it.
    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("platform", "linkedin")
      .eq("handle", handle)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from("channels").update(fields).eq("id", existing.id)
      : await supabase.from("channels").insert({ org_id: orgId, platform: "linkedin", handle, ...fields });
    if (error) return fail("save_failed");
  } catch {
    return fail("li_connect_failed");
  }

  const res = NextResponse.redirect(`${APP_URL}/channels?connected=linkedin`);
  res.cookies.delete("li_oauth_state");
  return res;
}
