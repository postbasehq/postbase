import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { encryptJson } from "@/lib/crypto";
import { exchangeCode, getChannel, hasRequiredScopes, type YouTubeTokens } from "@/lib/platforms/youtube";
import { saveChannel } from "@/lib/channel-store";

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

  const googleError = searchParams.get("error");
  if (googleError) {
    console.error("[youtube callback] Google returned error:", googleError);
    return fail(googleError === "access_denied" ? "yt_denied" : "yt_connect_failed");
  }
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
    if (!hasRequiredScopes(token.scope)) {
      console.error("[youtube callback] missing scopes, granted:", token.scope);
      return fail("yt_scopes");
    }
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

    // Saved with the service role, scoped to this workspace (lib/channel-store.ts).
    const saved = await saveChannel(orgId, "youtube", handle, fields);
    if (saved.limit) return fail("channel_limit");
    const error = saved.error ? { message: saved.error } : null;
    if (error) {
      console.error("[youtube callback] save failed:", error.message);
      return fail("save_failed");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[youtube callback] connect failed:", msg);
    if (/no youtube channel/i.test(msg)) return fail("yt_no_channel");
    if (/quota/i.test(msg)) return fail("yt_quota");
    if (/scope|insufficient/i.test(msg)) return fail("yt_scopes");
    return fail("yt_connect_failed");
  }

  const res = NextResponse.redirect(`${APP_URL}/channels?connected=youtube`);
  res.cookies.delete("yt_oauth_state");
  return res;
}
