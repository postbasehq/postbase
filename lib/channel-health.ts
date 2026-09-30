import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

/**
 * Errors that mean the platform no longer accepts this channel's access (expired,
 * revoked, a changed password, a missing permission). Retrying can't fix these;
 * only reconnecting the channel can.
 */
const AUTH_ERROR = new RegExp(
  [
    "reconnect the channel",
    "token (?:expired|refresh failed)",
    "could not read stored",
    "invalid_grant",
    "access_token_invalid",
    "scope_not_authorized",
    "invalid_access_token",
    "expired_access_token",
    "access token is invalid",
    "invalid authentication credentials",
    "error validating access token",
    "invalid identifier or password",
    "authenticationrequired",
    "expiredtoken",
    "token (?:has been|was) revoked",
    "\\bunauthori[sz]ed\\b",
  ].join("|"),
  "i",
);

export function needsReconnect(error: string | null | undefined): boolean {
  return Boolean(error && AUTH_ERROR.test(error));
}

/** Mark a channel as needing a reconnect, keeping the platform's error for the prompt. */
export async function flagReconnect(db: Db, channelId: string, error: string): Promise<void> {
  await db
    .from("channels")
    .update({ status: "reconnect", status_error: error, status_at: new Date().toISOString() })
    .eq("id", channelId)
    .neq("status", "reconnect");
}

/** A post went out, so the connection works: clear any reconnect flag. */
export async function clearReconnect(db: Db, channelId: string): Promise<void> {
  await db
    .from("channels")
    .update({ status: "active", status_error: null, status_at: null })
    .eq("id", channelId)
    .eq("status", "reconnect");
}

/** How far ahead to warn about a connection that will lapse on its own. */
export const RECONNECT_WARN_MS = 7 * 24 * 60 * 60 * 1000;

export type ChannelHealth = "ok" | "reconnect" | "expiring";

/** A channel's health from its row: flagged, lapsed, lapsing soon, or fine. */
export function channelHealth(c: { status: string; reconnect_by?: string | null }): ChannelHealth {
  if (c.status === "reconnect") return "reconnect";
  if (c.reconnect_by) {
    const left = Date.parse(c.reconnect_by) - Date.now();
    if (left <= 0) return "reconnect";
    if (left <= RECONNECT_WARN_MS) return "expiring";
  }
  return "ok";
}

/** The platform's error, in plain words, for the reconnect prompt. */
export function reconnectReason(error: string | null | undefined, platform?: string): string {
  const e = error ?? "";
  if (/60 days/i.test(e)) return "LinkedIn connections last 60 days, so this one has expired.";
  if (/could not read stored/i.test(e)) return "Postbase couldn’t read this account’s saved login.";
  if (/scope_not_authorized/i.test(e)) return "A permission Postbase needs was turned off when this account was connected.";
  if (/password|identifier/i.test(e)) return "The app password for this account no longer works.";
  if (/revoked|unauthori[sz]ed|invalid/i.test(e)) {
    return "Access was revoked or has stopped working. This happens if you removed Postbase from your account settings or changed your password.";
  }
  if (/expired|refresh failed|invalid_grant/i.test(e)) {
    return `The connection to ${platform ?? "this account"} expired and couldn’t renew itself.`;
  }
  return "This account stopped accepting posts from Postbase.";
}

/** "4 Oct": fixed locale and zone so server and browser render the same text. */
export function formatReconnectBy(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
