import { decryptJson, encryptJson } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { postThread, uploadMedia, refreshTokens, type XTokens } from "@/lib/platforms/x";

/**
 * Platform publishing adapters — common interface so adding a platform is additive
 * (docs/TECH_STACK.md §4). Each adapter posts via that platform's API using the
 * channel's stored (encrypted) OAuth tokens.
 *
 * X is live. LinkedIn / Instagram remain stubbed until their API access is granted.
 */

export type MediaItem = { url: string; type: string };

export type PublishInput = {
  platform: string;
  body: string;
  threadTail: string[];
  media: MediaItem[];
  channelId: string;
  handle: string | null;
  encryptedTokens: string | null;
  tokenExpiry: string | null;
};

export type PublishResult =
  | { ok: true; platformPostId: string }
  | { ok: false; error: string };

function simulate(platform: string): PublishResult {
  return {
    ok: true,
    platformPostId: `${platform}_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

function isExpiring(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() >= Date.parse(iso) - 120_000; // 2-min buffer
}

async function publishToX(input: PublishInput): Promise<PublishResult> {
  if (!input.encryptedTokens) return { ok: false, error: "X account not connected." };

  let tokens: XTokens;
  try {
    tokens = decryptJson<XTokens>(input.encryptedTokens);
  } catch (e) {
    return {
      ok: false,
      error: `Could not read stored X credentials: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Refresh an expiring access token and persist the new tokens.
  if (isExpiring(input.tokenExpiry) && tokens.refresh_token) {
    try {
      const refreshed = await refreshTokens(tokens.refresh_token);
      tokens = { ...tokens, ...refreshed };
      const db = createAdminClient();
      await db
        .from("channels")
        .update({
          encrypted_tokens: encryptJson(tokens),
          token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("id", input.channelId);
    } catch {
      return { ok: false, error: "X token refresh failed — reconnect the channel." };
    }
  }

  const texts = [input.body, ...input.threadTail].map((t) => t.trim()).filter(Boolean);
  try {
    // Upload any media first, then attach the ids to the lead tweet.
    const mediaIds: string[] = [];
    for (const m of input.media) {
      const res = await fetch(m.url);
      if (!res.ok) throw new Error(`Couldn't fetch media (${res.status})`);
      const bytes = await res.arrayBuffer();
      mediaIds.push(await uploadMedia(tokens.access_token, bytes, m.type));
    }
    const { id } = await postThread(tokens.access_token, texts, mediaIds);
    return { ok: true, platformPostId: id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "X publish failed." };
  }
}

export async function publish(input: PublishInput): Promise<PublishResult> {
  if (!input.body.trim()) {
    return { ok: false, error: "Post body is empty." };
  }

  switch (input.platform) {
    case "x":
      return publishToX(input);
    case "linkedin":
      // TODO: real LinkedIn Posts API with w_member_social.
      return simulate("linkedin");
    case "instagram":
      // TODO: real Instagram Graph API (business/creator accounts).
      return simulate("instagram");
    case "youtube":
      return simulate("youtube");
    default:
      return { ok: false, error: `Unsupported platform: ${input.platform}` };
  }
}
