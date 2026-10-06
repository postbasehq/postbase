import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { isDefinitiveAuthFailure } from "@/lib/platforms/token-error";

/*
 * Refreshing a channel's OAuth tokens, safely:
 *  - One refresh per channel at a time (a lease on channels.refresh_lock_until,
 *    migration 0058). X refresh tokens are single-use, so two concurrent
 *    refreshes (publisher + analytics, or overlapping cron runs) used to make
 *    the loser fail and flag a healthy channel "reconnect". Now the others wait
 *    and pick up the new tokens.
 *  - "Reconnect" only when the network definitively refused the refresh token
 *    (TokenAuthLost); outages and garbled replies are TokenRefreshUnavailable,
 *    which callers retry.
 *  - The new tokens are saved with a retry: for X the old refresh token is
 *    already spent, so losing the write would kill the channel.
 */

export class TokenAuthLost extends Error {}
export class TokenRefreshUnavailable extends Error {}

type Refreshed = { access_token?: string; refresh_token?: string; expires_in?: number };
type BaseTokens = { access_token: string; refresh_token?: string };

const LEASE_MS = 30_000;
const WAIT_STEPS = 10;
const WAIT_MS = 1_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readRow(channelId: string) {
  const { data, error } = await createAdminClient()
    .from("channels")
    .select("encrypted_tokens, token_expiry")
    .eq("id", channelId)
    .maybeSingle();
  if (error) throw new TokenRefreshUnavailable(`Couldn't read the channel: ${error.message}`);
  return data as { encrypted_tokens: string | null; token_expiry: string | null } | null;
}

export async function refreshChannelTokens<T extends BaseTokens>(opts: {
  channelId: string;
  /** The encrypted tokens as the caller read them. */
  encrypted: string;
  refresh: (refreshToken: string) => Promise<Refreshed>;
  /** Label for messages, e.g. "X". */
  label: string;
}): Promise<{ tokens: T; tokenExpiry: string | null }> {
  const db = createAdminClient();
  const now = new Date();

  // Take the lease (only if nobody holds a live one).
  const { data: leased, error: leaseError } = await db
    .from("channels")
    .update({ refresh_lock_until: new Date(now.getTime() + LEASE_MS).toISOString() })
    .eq("id", opts.channelId)
    .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${now.toISOString()}`)
    .select("encrypted_tokens, token_expiry");
  if (leaseError) throw new TokenRefreshUnavailable(`Couldn't start the ${opts.label} token refresh: ${leaseError.message}`);

  if (!leased?.length) {
    // Someone else is refreshing: wait for their new tokens.
    for (let i = 0; i < WAIT_STEPS; i++) {
      await sleep(WAIT_MS);
      const row = await readRow(opts.channelId);
      if (row?.encrypted_tokens && row.encrypted_tokens !== opts.encrypted) {
        return { tokens: decryptJson<T>(row.encrypted_tokens), tokenExpiry: row.token_expiry };
      }
    }
    throw new TokenRefreshUnavailable(`${opts.label} access is being renewed. It will be retried.`);
  }

  const release = () => db.from("channels").update({ refresh_lock_until: null }).eq("id", opts.channelId);
  const current = leased[0] as { encrypted_tokens: string | null; token_expiry: string | null };

  // Refreshed by someone else between the caller's read and our lease: use theirs.
  if (current.encrypted_tokens && current.encrypted_tokens !== opts.encrypted) {
    await release();
    return { tokens: decryptJson<T>(current.encrypted_tokens), tokenExpiry: current.token_expiry };
  }

  const tokens = decryptJson<T>(opts.encrypted);
  if (!tokens.refresh_token) {
    await release();
    throw new TokenAuthLost(`${opts.label} token refresh failed — reconnect the channel.`);
  }

  let refreshed: Refreshed;
  try {
    refreshed = await opts.refresh(tokens.refresh_token);
    if (!refreshed.access_token) throw new Error("no access token returned");
  } catch (e) {
    await release();
    if (isDefinitiveAuthFailure(e)) {
      // A concurrent refresh outside the lease (an older deployment) may have
      // spent the token: if the row changed, those are good tokens.
      const row = await readRow(opts.channelId);
      if (row?.encrypted_tokens && row.encrypted_tokens !== opts.encrypted) {
        return { tokens: decryptJson<T>(row.encrypted_tokens), tokenExpiry: row.token_expiry };
      }
      throw new TokenAuthLost(`${opts.label} token refresh failed — reconnect the channel.`);
    }
    // The provider's own text stays in the logs: words like "Unauthorized" in it
    // would read as a lost connection (lib/channel-health.ts) and flag a reconnect.
    console.error(`[token-refresh] ${opts.label} refresh unavailable for ${opts.channelId}:`, e instanceof Error ? e.message : e);
    throw new TokenRefreshUnavailable(`Couldn't renew ${opts.label} access just now. It will be retried.`);
  }

  const next = {
    ...tokens,
    access_token: refreshed.access_token!,
    refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
  } as T;
  const tokenExpiry = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null;
  const save = { encrypted_tokens: encryptJson(next), token_expiry: tokenExpiry, refresh_lock_until: null };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await db.from("channels").update(save).eq("id", opts.channelId);
    if (!error) return { tokens: next, tokenExpiry };
    await sleep(500 * (attempt + 1));
  }
  // Still usable for this send; the next refresh will need a reconnect if the
  // old token was single-use. Make sure someone hears about it.
  Sentry.captureMessage(`[token-refresh] couldn't save refreshed ${opts.label} tokens for channel ${opts.channelId}`, "error");
  return { tokens: next, tokenExpiry };
}

/** The publish error for a failed refresh: "reconnect" only when the login is truly gone. */
export function refreshFailureMessage(e: unknown, label: string): string {
  if (e instanceof TokenAuthLost) return e.message;
  if (e instanceof TokenRefreshUnavailable) return e.message;
  return `Couldn't renew ${label} access just now. It will be retried.`;
}
