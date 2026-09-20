import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { atChannelLimit } from "@/lib/billing-guard";
import { encryptJson } from "@/lib/crypto";
import { exchangeCode, getMeId, longLivedToken, resolvePages, type FacebookTokens } from "@/lib/platforms/meta";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Facebook OAuth callback: exchange the code, pick a Page, store it as a channel.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const savedState = jar.get("fb_oauth_state")?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${APP_URL}/channels?error=${reason}`);
    res.cookies.delete("fb_oauth_state");
    return res;
  };

  if (searchParams.get("error")) return fail("fb_connect_failed");
  if (!code || !state || state !== savedState) return fail("oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  const orgId = await getCurrentOrgId();
  if (!orgId) return fail("no_workspace");

  try {
    const shortToken = await exchangeCode(code, process.env.FACEBOOK_CALLBACK_URL);
    const longLived = await longLivedToken(shortToken);
    const pages = await resolvePages(longLived.access_token);
    const page = pages[0];
    if (!page) return fail("fb_no_page");

    const tokens: FacebookTokens = {
      access_token: page.access_token, // Page tokens from a long-lived user token don't expire
      page_id: page.id,
      page_name: page.name,
    };
    const handle = page.name;
    const tokenExpiry = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    const fields = {
      encrypted_tokens: encryptJson(tokens),
      token_expiry: tokenExpiry,
      status: "active",
      // App-scoped FB user id — lets the deauthorize/data-deletion callbacks
      // find and remove this channel when the user removes the app.
      provider_user_id: await getMeId(longLived.access_token),
    };

    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("platform", "facebook")
      .eq("handle", handle)
      .maybeSingle();

    if (!existing && (await atChannelLimit(supabase, orgId))) return fail("channel_limit");

    const { error } = existing
      ? await supabase.from("channels").update(fields).eq("id", existing.id)
      : await supabase.from("channels").insert({ org_id: orgId, platform: "facebook", handle, ...fields });
    if (error) return fail("save_failed");
  } catch {
    return fail("fb_connect_failed");
  }

  const res = NextResponse.redirect(`${APP_URL}/channels?connected=facebook`);
  res.cookies.delete("fb_oauth_state");
  return res;
}
