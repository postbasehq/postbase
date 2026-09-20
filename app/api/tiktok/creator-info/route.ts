import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { decryptJson } from "@/lib/crypto";
import { creatorInfo, type TikTokTokens } from "@/lib/platforms/tiktok";

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

  const { data: channel } = await supabase
    .from("channels")
    .select("id, encrypted_tokens")
    .eq("id", channelId)
    .eq("org_id", orgId)
    .eq("platform", "tiktok")
    .maybeSingle();
  if (!channel?.encrypted_tokens) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let tokens: TikTokTokens;
  try {
    tokens = decryptJson<TikTokTokens>(channel.encrypted_tokens);
  } catch {
    return NextResponse.json({ error: "bad_credentials" }, { status: 500 });
  }

  try {
    const info = await creatorInfo(tokens.access_token);
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
    return NextResponse.json(
      { error: "creator_info_failed", message: e instanceof Error ? e.message : "failed" },
      { status: 502 },
    );
  }
}
