import { decryptJson } from "@/lib/crypto";
import { refreshTokens, type TikTokTokens } from "@/lib/platforms/tiktok";
import { refreshChannelTokens } from "@/lib/platforms/token-refresh";

// TikTok access tokens last ~24h; refresh a little before they lapse.
const REFRESH_BUFFER_MS = 120_000;

function isExpiring(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() >= Date.parse(iso) - REFRESH_BUFFER_MS;
}

/**
 * A channel's TikTok tokens, refreshed (and persisted) when the access token is
 * expiring — or always, with `force`, e.g. after TikTok rejected the token.
 * Throws TokenAuthLost when TikTok refused the refresh token (reconnect needed)
 * and TokenRefreshUnavailable for anything temporary (lib/platforms/token-refresh).
 */
export async function freshTikTokTokens(
  channelId: string,
  encryptedTokens: string,
  tokenExpiry: string | null,
  { force = false }: { force?: boolean } = {},
): Promise<TikTokTokens> {
  const tokens = decryptJson<TikTokTokens>(encryptedTokens);
  if (!(force || isExpiring(tokenExpiry)) || !tokens.refresh_token) return tokens;
  const { tokens: next } = await refreshChannelTokens<TikTokTokens>({
    channelId,
    encrypted: encryptedTokens,
    refresh: refreshTokens,
    label: "TikTok",
  });
  return next;
}
