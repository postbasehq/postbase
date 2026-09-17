import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { atChannelLimit } from "@/lib/billing-guard";
import { encryptJson } from "@/lib/crypto";
import { exchangeCode, getChannel, type YouTubeTokens } from "@/lib/platforms/youtube";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// YouTube OAuth callback: exchange the code, read the channel, store it.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const savedState = jar.get("yt_oauth_state")?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${APP_URL}/channels?error=${reason}`);
    res.cookies.delete("yt_oauth_state");
    return res;
  };

  if (searchParams.get("error")) return fail("yt_connect_failed");
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
    const channel = await getChannel(token.access_token!);

    const tokens: YouTubeTokens = {
      access_token: token.access_token!,
      refresh_token: token.refresh_token,
      channel_id: channel.id,
      channel_title: channel.title,
    };
    const handle = channel.title;
    const tokenExpiry = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const fields = {
      encrypted_tokens: encryptJson(tokens),
      token_expiry: tokenExpiry,
      status: "active",
      display_name: channel.title ?? null,
      avatar_url: channel.avatar_url ?? null,
    };

    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("platform", "youtube")
      .eq("handle", handle)
      .maybeSingle();

    if (!existing && (await atChannelLimit(supabase, orgId))) return fail("channel_limit");

    const { error } = existing
      ? await supabase.from("channels").update(fields).eq("id", existing.id)
      : await supabase.from("channels").insert({ org_id: orgId, platform: "youtube", handle, ...fields });
    if (error) return fail("save_failed");
  } catch {
    return fail("yt_connect_failed");
  }

  const res = NextResponse.redirect(`${APP_URL}/channels?connected=youtube`);
  res.cookies.delete("yt_oauth_state");
  return res;
}
