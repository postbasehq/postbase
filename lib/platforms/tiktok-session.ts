import { createAdminClient } from "@/lib/supabase/admin";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { refreshTokens, type TikTokTokens } from "@/lib/platforms/tiktok";

// TikTok access tokens last ~24h; refresh a little before they lapse.
const REFRESH_BUFFER_MS = 120_000;

function isExpiring(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() >= Date.parse(iso) - REFRESH_BUFFER_MS;
}

/**
 * A channel's TikTok tokens, refreshed (and persisted) when the access token is
 * expiring — or always, with `force`, e.g. after TikTok rejected the token.
 * Throws if the tokens can't be read or the refresh fails (reconnect needed).
 */
export async function freshTikTokTokens(
  channelId: string,
  encryptedTokens: string,
  tokenExpiry: string | null,
  { force = false }: { force?: boolean } = {},
): Promise<TikTokTokens> {
  const tokens = decryptJson<TikTokTokens>(encryptedTokens);
  if (!(force || isExpiring(tokenExpiry)) || !tokens.refresh_token) return tokens;

  const refreshed = await refreshTokens(tokens.refresh_token);
  if (!refreshed.access_token) throw new Error("TikTok token refresh returned no access token.");
  const next: TikTokTokens = {
    ...tokens,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
  };
  await createAdminClient()
    .from("channels")
    .update({
      encrypted_tokens: encryptJson(next),
      token_expiry: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : null,
    })
    .eq("id", channelId);
  return next;
}
