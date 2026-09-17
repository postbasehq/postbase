import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { decryptJson } from "@/lib/crypto";
import { getMe as xGetMe, type XTokens } from "@/lib/platforms/x";
import { getMe as liGetMe, type LinkedInTokens } from "@/lib/platforms/linkedin";
import { getUser as ttGetUser, type TikTokTokens } from "@/lib/platforms/tiktok";
import { getChannel as ytGetChannel, type YouTubeTokens } from "@/lib/platforms/youtube";
import { resolveInstagram, type MetaTokens } from "@/lib/platforms/meta";
import { verifyAccount, type MastodonTokens } from "@/lib/platforms/mastodon";
import { connectBluesky, type BlueskyTokens } from "@/lib/platforms/bluesky";

type Profile = { display_name?: string | null; avatar_url?: string | null; verified?: boolean };

/**
 * Best-effort backfill of display_name + avatar_url for the current org's
 * already-connected channels (new/reconnected channels capture these at connect
 * time). Each channel is independent — a failure (e.g. an expired token) just
 * skips that channel; it'll be filled on the next reconnect. POST to run.
 *
 * Must run where TOKEN_ENCRYPTION_KEY is set (i.e. production), since it
 * decrypts each channel's stored tokens.
 */
export async function POST() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return NextResponse.json({ error: "No workspace." }, { status: 401 });

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, encrypted_tokens, display_name, avatar_url, verified")
    .eq("org_id", orgId);

  let updated = 0;
  const results: { platform: string; ok: boolean; error?: string }[] = [];

  for (const c of channels ?? []) {
    if (c.display_name && c.avatar_url) continue; // already have both
    if (!c.encrypted_tokens) continue;
    try {
      const profile = await fetchProfile(c.platform, c.encrypted_tokens);
      if (profile && (profile.display_name || profile.avatar_url)) {
        await supabase
          .from("channels")
          .update({
            display_name: c.display_name ?? profile.display_name ?? null,
            avatar_url: c.avatar_url ?? profile.avatar_url ?? null,
            ...(profile.verified != null ? { verified: profile.verified } : {}),
          })
          .eq("id", c.id);
        updated += 1;
        results.push({ platform: c.platform, ok: true });
      } else {
        results.push({ platform: c.platform, ok: false, error: "no profile data" });
      }
    } catch (e) {
      results.push({ platform: c.platform, ok: false, error: e instanceof Error ? e.message : "failed" });
    }
  }

  return NextResponse.json({ updated, results });
}

async function fetchProfile(platform: string, encrypted: string): Promise<Profile | null> {
  switch (platform) {
    case "x": {
      const t = decryptJson<XTokens>(encrypted);
      const me = await xGetMe(t.access_token);
      return { display_name: me.name, avatar_url: me.avatar_url, verified: me.verified };
    }
    case "linkedin": {
      const t = decryptJson<LinkedInTokens>(encrypted);
      const me = await liGetMe(t.access_token);
      return { display_name: me.name, avatar_url: me.picture };
    }
    case "tiktok": {
      const t = decryptJson<TikTokTokens>(encrypted);
      const me = await ttGetUser(t.access_token);
      return { display_name: me.display_name, avatar_url: me.avatar_url };
    }
    case "youtube": {
      const t = decryptJson<YouTubeTokens>(encrypted);
      const ch = await ytGetChannel(t.access_token);
      return { display_name: ch.title, avatar_url: ch.avatar_url };
    }
    case "instagram": {
      const t = decryptJson<MetaTokens>(encrypted);
      if (!t.user_access_token) return null;
      const ig = await resolveInstagram(t.user_access_token);
      return { display_name: ig.name, avatar_url: ig.avatarUrl };
    }
    case "mastodon": {
      const t = decryptJson<MastodonTokens>(encrypted);
      const acc = await verifyAccount(t.instance, t.access_token);
      return { display_name: acc.display_name, avatar_url: acc.avatar_url };
    }
    case "bluesky": {
      const t = decryptJson<BlueskyTokens>(encrypted);
      const c = await connectBluesky(t.identifier, t.app_password, t.service);
      return { display_name: c.profile?.displayName, avatar_url: c.profile?.avatarUrl };
    }
    default:
      return null;
  }
}
