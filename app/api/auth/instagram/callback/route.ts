import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { atChannelLimit } from "@/lib/billing-guard";
import { encryptJson } from "@/lib/crypto";
import { exchangeCode, longLivedToken, resolveInstagram, type MetaTokens } from "@/lib/platforms/meta";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Instagram OAuth callback: exchange the code, resolve the IG Business account,
// store the channel with encrypted Page tokens.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const savedState = jar.get("ig_oauth_state")?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${APP_URL}/channels?error=${reason}`);
    res.cookies.delete("ig_oauth_state");
    return res;
  };

  // Meta appends error params when the user declines the dialog.
  if (searchParams.get("error")) return fail("ig_connect_failed");
  if (!code || !state || state !== savedState) return fail("oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  const orgId = await getCurrentOrgId();
  if (!orgId) return fail("no_workspace");

  try {
    const shortToken = await exchangeCode(code);
    const longLived = await longLivedToken(shortToken);
    const ig = await resolveInstagram(longLived.access_token);

    const tokens: MetaTokens = {
      access_token: ig.pageAccessToken, // Page tokens from a long-lived user token don't expire
      ig_user_id: ig.igUserId,
      page_id: ig.pageId,
      user_access_token: longLived.access_token,
    };
    const handle = ig.username ? `@${ig.username}` : `ig:${ig.igUserId}`;
    // Long-lived user token expiry (informational — Page tokens themselves are durable).
    const tokenExpiry = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    const fields = {
      encrypted_tokens: encryptJson(tokens),
      token_expiry: tokenExpiry,
      status: "active",
    };

    // Reconnecting the same account updates the existing channel instead of duplicating it.
    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("platform", "instagram")
      .eq("handle", handle)
      .maybeSingle();

    if (!existing && (await atChannelLimit(supabase, orgId))) return fail("channel_limit");

    const { error } = existing
      ? await supabase.from("channels").update(fields).eq("id", existing.id)
      : await supabase.from("channels").insert({ org_id: orgId, platform: "instagram", handle, ...fields });
    if (error) return fail("save_failed");
  } catch {
    return fail("ig_connect_failed");
  }

  const res = NextResponse.redirect(`${APP_URL}/channels?connected=instagram`);
  res.cookies.delete("ig_oauth_state");
  return res;
}
