import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptJson } from "@/lib/crypto";
import { registerApp, authorizeUrl, normalizeInstance } from "@/lib/platforms/mastodon";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };

// Start the Mastodon OAuth flow for a user-supplied instance. Because Mastodon
// is federated, we register an app on that instance on the fly, then redirect.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  const instanceInput = new URL(request.url).searchParams.get("instance")?.trim();
  if (!instanceInput) return NextResponse.redirect(`${APP_URL}/channels?error=mt_no_instance`);

  let instance: string;
  try {
    instance = normalizeInstance(instanceInput);
    // Reject anything that isn't a plausible host.
    if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(instance)) throw new Error("bad instance");
  } catch {
    return NextResponse.redirect(`${APP_URL}/channels?error=mt_bad_instance`);
  }

  const redirectUri = `${APP_URL}/api/auth/mastodon/callback`;
  try {
    const app = await registerApp(instance, redirectUri);
    const state = crypto.randomUUID();
    const res = NextResponse.redirect(authorizeUrl(instance, app.client_id, redirectUri, state));
    // Carry the instance + app credentials across the redirect (encrypted).
    res.cookies.set(
      "mastodon_oauth",
      encryptJson({ instance, client_id: app.client_id, client_secret: app.client_secret, state }),
      cookieOpts,
    );
    return res;
  } catch {
    return NextResponse.redirect(`${APP_URL}/channels?error=mt_connect_failed`);
  }
}
