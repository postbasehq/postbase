import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { atChannelLimit } from "@/lib/billing-guard";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { exchangeCode, verifyAccount, type MastodonTokens } from "@/lib/platforms/mastodon";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Reverse the base64url encoding applied when the cookie was set.
const fromCookie = (s: string) => {
  const p = s.replace(/-/g, "+").replace(/_/g, "/");
  return p + "=".repeat((4 - (p.length % 4)) % 4);
};

type Pending = { instance: string; client_id: string; client_secret: string; state: string };

export async function GET(request: Request) {
  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${APP_URL}/channels?error=${reason}`);
    res.cookies.delete("mastodon_oauth");
    return res;
  };

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("mt_connect_failed");

  const raw = (await cookies()).get("mastodon_oauth")?.value;
  if (!raw) return fail("oauth_state");
  let pending: Pending;
  try {
    pending = decryptJson<Pending>(fromCookie(raw));
  } catch {
    return fail("oauth_state");
  }
  if (pending.state !== state) return fail("oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  const orgId = await getCurrentOrgId();
  if (!orgId) return fail("no_workspace");

  try {
    const redirectUri = `${APP_URL}/api/auth/mastodon/callback`;
    const accessToken = await exchangeCode(
      pending.instance,
      pending.client_id,
      pending.client_secret,
      redirectUri,
      code,
    );
    const { instance, account_id, handle, display_name, avatar_url } = await verifyAccount(
      pending.instance,
      accessToken,
    );

    const tokens: MastodonTokens = { instance, access_token: accessToken, account_id, handle };
    const fields = {
      encrypted_tokens: encryptJson(tokens),
      status: "active",
      display_name: display_name || null,
      avatar_url: avatar_url ?? null,
    };

    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("platform", "mastodon")
      .eq("handle", handle)
      .maybeSingle();

    if (!existing && (await atChannelLimit(supabase, orgId))) return fail("channel_limit");

    const { error } = existing
      ? await supabase.from("channels").update(fields).eq("id", existing.id)
      : await supabase.from("channels").insert({ org_id: orgId, platform: "mastodon", handle, ...fields });
    if (error) return fail("save_failed");
  } catch {
    return fail("mt_connect_failed");
  }

  const res = NextResponse.redirect(`${APP_URL}/channels?connected=mastodon`);
  res.cookies.delete("mastodon_oauth");
  return res;
}
