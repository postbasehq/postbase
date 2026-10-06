import { NextResponse } from "next/server";
import { notifyReconnect } from "@/lib/email/notify";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { creatorInfo, type TikTokTokens } from "@/lib/platforms/tiktok";
import { freshTikTokTokens } from "@/lib/platforms/tiktok-session";
import { TokenAuthLost, refreshFailureMessage } from "@/lib/platforms/token-refresh";
import { createAdminClient } from "@/lib/supabase/admin";
import { flagReconnect, needsReconnect } from "@/lib/channel-health";

export const runtime = "nodejs";

/**
 * TikTok Content Sharing Guidelines require querying creator_info before a
 * Direct Post, and surfacing the account's real privacy options + interaction
 * settings in the UI. This returns those for the selected TikTok channel.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgId = await getCurrentOrgId();
  if (!orgId) return NextResponse.json({ error: "no_workspace" }, { status: 400 });

  let body: { channel_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const channelId = String(body.channel_id ?? "");
  if (!channelId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Members can't read encrypted_tokens (migration 0057): read it server-side,
  // scoped to the caller's workspace.
  const { data: channel } = await createAdminClient()
    .from("channels")
    .select("id, encrypted_tokens, token_expiry")
    .eq("id", channelId)
    .eq("org_id", orgId)
    .eq("platform", "tiktok")
    .maybeSingle();
  if (!channel?.encrypted_tokens) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // TikTok access tokens last ~24h and are otherwise only refreshed when
  // publishing, so refresh here too — and once more if TikTok rejects the token.
  let tokens: TikTokTokens;
  try {
    tokens = await freshTikTokTokens(channel.id, channel.encrypted_tokens, channel.token_expiry);
  } catch (e) {
    // Only a refused refresh token means reconnect; an outage is temporary.
    if (!(e instanceof TokenAuthLost)) {
      return NextResponse.json({ error: "creator_info_failed", message: refreshFailureMessage(e, "TikTok") }, { status: 503 });
    }
    if (await flagReconnect(createAdminClient(), channel.id, e.message)) {
      await notifyReconnect(channel.id);
    }
    return NextResponse.json({ error: "reconnect_required" }, { status: 401 });
  }

  try {
    let info;
    try {
      info = await creatorInfo(tokens.access_token);
    } catch {
      // Re-read: the refresh above may have rotated the stored tokens.
      const { data: latest } = await createAdminClient()
        .from("channels")
        .select("encrypted_tokens")
        .eq("id", channel.id)
        .eq("org_id", orgId)
        .single();
      tokens = await freshTikTokTokens(channel.id, latest?.encrypted_tokens ?? channel.encrypted_tokens, null, {
        force: true,
      });
      info = await creatorInfo(tokens.access_token);
    }
    return NextResponse.json({
      nickname: info.creator_nickname ?? null,
      username: info.creator_username ?? null,
      avatarUrl: info.creator_avatar_url ?? null,
      privacyOptions: info.privacy_level_options ?? [],
      commentDisabled: info.comment_disabled ?? false,
      duetDisabled: info.duet_disabled ?? false,
      stitchDisabled: info.stitch_disabled ?? false,
      maxDurationSec: info.max_video_post_duration_sec ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed";
    if (needsReconnect(message)) {
      if (await flagReconnect(createAdminClient(), channel.id, message)) await notifyReconnect(channel.id);
      return NextResponse.json({ error: "reconnect_required", message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "creator_info_failed", message: e instanceof Error ? e.message : "failed" },
      { status: 502 },
    );
  }
}
