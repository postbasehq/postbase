import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { atChannelLimit } from "@/lib/billing-guard";
import { encryptJson } from "@/lib/crypto";
import { exchangeCode, getUser, type TikTokTokens } from "@/lib/platforms/tiktok";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// TikTok OAuth callback: exchange the code, read the creator, store the channel.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const savedState = jar.get("tt_oauth_state")?.value;
  const verifier = jar.get("tt_oauth_verifier")?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${APP_URL}/channels?error=${reason}`);
    res.cookies.delete("tt_oauth_state");
    res.cookies.delete("tt_oauth_verifier");
    return res;
  };

  // TikTok appends error params when the user declines.
  if (searchParams.get("error")) return fail("tt_connect_failed");
  if (!code || !state || state !== savedState || !verifier) return fail("oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  const orgId = await getCurrentOrgId();
  if (!orgId) return fail("no_workspace");

  try {
    const token = await exchangeCode(code, verifier);
    const me = await getUser(token.access_token!);

    const tokens: TikTokTokens = {
      access_token: token.access_token!,
      refresh_token: token.refresh_token,
      open_id: token.open_id ?? me.open_id,
      scope: token.scope,
    };
    const handle = me.display_name ? `@${me.display_name}` : `tiktok:${tokens.open_id.slice(0, 8)}`;
    const tokenExpiry = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const fields = {
      encrypted_tokens: encryptJson(tokens),
      token_expiry: tokenExpiry,
      status: "active",
    };

    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("platform", "tiktok")
      .eq("handle", handle)
      .maybeSingle();

    if (!existing && (await atChannelLimit(supabase, orgId))) return fail("channel_limit");

    const { error } = existing
      ? await supabase.from("channels").update(fields).eq("id", existing.id)
      : await supabase.from("channels").insert({ org_id: orgId, platform: "tiktok", handle, ...fields });
    if (error) return fail("save_failed");
  } catch {
    return fail("tt_connect_failed");
  }

  const res = NextResponse.redirect(`${APP_URL}/channels?connected=tiktok`);
  res.cookies.delete("tt_oauth_state");
  res.cookies.delete("tt_oauth_verifier");
  return res;
}
