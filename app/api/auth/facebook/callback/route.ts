import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { exchangeCode, getMeId, longLivedToken } from "@/lib/platforms/meta";
import { listMetaOptions, PICK_COOKIE, PICK_TTL_S, saveMetaChannels, sealPick } from "@/lib/meta-connect";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Facebook OAuth callback: exchange the code, find the Pages this login manages,
// and connect the one (or ask which, if several).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const savedState = jar.get("fb_oauth_state")?.value;

  const done = (query: string) => {
    const res = NextResponse.redirect(`${APP_URL}/channels?${query}`);
    res.cookies.delete("fb_oauth_state");
    return res;
  };
  const fail = (reason: string) => done(`error=${reason}`);

  // Meta appends error params when the user declines the dialog.
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
    const pick = {
      platform: "facebook" as const,
      userToken: longLived.access_token,
      fbUserId: await getMeId(longLived.access_token),
      tokenExpiry: longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000).toISOString() : null,
    };
    const options = await listMetaOptions(supabase, orgId, "facebook", pick.userToken);
    if (options.length === 0) return fail("fb_no_page");

    // Several accounts: ask which to connect.
    if (options.length > 1) {
      const res = done("pick=facebook");
      res.cookies.set(PICK_COOKIE, sealPick({ ...pick, orgId }), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: PICK_TTL_S,
      });
      return res;
    }

    const result = await saveMetaChannels(supabase, orgId, pick, [options[0].id]);
    if (result.limitHit) return fail("channel_limit");
    if (result.failed || result.saved === 0) return fail("save_failed");
  } catch {
    return fail("fb_connect_failed");
  }

  return done("connected=facebook");
}
