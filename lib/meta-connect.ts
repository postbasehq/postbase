import type { SupabaseClient } from "@supabase/supabase-js";
import { atChannelLimit } from "@/lib/billing-guard";
import { encryptJson, decryptJson } from "@/lib/crypto";
import {
  listInstagramAccounts,
  resolvePages,
  type FacebookTokens,
  type MetaTokens,
} from "@/lib/platforms/meta";

/**
 * Connecting Instagram or Facebook: one Facebook login can reach many Pages and
 * Instagram accounts. With one, it's connected straight away; with several, the
 * login is parked in a short-lived encrypted cookie and the Channels page asks
 * which to connect. Accounts are always re-read from Meta when saving, so the
 * cookie only ever carries the user token, never a list we trust.
 */

export type MetaPlatform = "instagram" | "facebook";

export const PICK_COOKIE = "meta_pick";
export const PICK_TTL_S = 15 * 60;

type Pick = {
  platform: MetaPlatform;
  orgId: string;
  userToken: string;
  fbUserId: string | null;
  /** Long-lived user token expiry (ISO), stored on the channel for reference. */
  tokenExpiry: string | null;
  exp: number;
};

export type MetaOption = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  connected: boolean;
};

export function sealPick(p: Omit<Pick, "exp">): string {
  return encryptJson({ ...p, exp: Date.now() + PICK_TTL_S * 1000 });
}

/** The parked login, if it's still valid and belongs to this workspace. */
export function openPick(sealed: string | undefined, orgId: string | null): Pick | null {
  if (!sealed || !orgId) return null;
  try {
    const p = decryptJson<Pick>(sealed);
    return p.exp > Date.now() && p.orgId === orgId ? p : null;
  } catch {
    return null;
  }
}

function handleFor(platform: MetaPlatform, a: { username?: string; name: string; id: string }): string {
  return platform === "instagram" ? (a.username ? `@${a.username}` : `ig:${a.id}`) : a.name;
}

/** Accounts this login can connect, marking ones already in the workspace. */
export async function listMetaOptions(
  supabase: SupabaseClient,
  orgId: string,
  platform: MetaPlatform,
  userToken: string,
): Promise<MetaOption[]> {
  const raw =
    platform === "instagram"
      ? (await listInstagramAccounts(userToken)).map((a) => ({
          id: a.igUserId,
          name: a.name || a.username,
          handle: handleFor("instagram", { username: a.username, name: a.name ?? "", id: a.igUserId }),
          avatarUrl: a.avatarUrl ?? null,
        }))
      : (await resolvePages(userToken)).map((pg) => ({
          id: pg.id,
          name: pg.name,
          handle: handleFor("facebook", pg),
          avatarUrl: pg.avatarUrl ?? null,
        }));

  const { data: existing } = await supabase
    .from("channels")
    .select("handle")
    .eq("org_id", orgId)
    .eq("platform", platform);
  const have = new Set((existing ?? []).map((c) => c.handle));
  return raw.map((o) => ({ ...o, connected: have.has(o.handle) }));
}

/**
 * Connect the chosen accounts (ids from listMetaOptions). Reconnecting an
 * account updates it in place; new ones stop at the plan's channel limit.
 */
export async function saveMetaChannels(
  supabase: SupabaseClient,
  orgId: string,
  pick: Omit<Pick, "exp" | "orgId">,
  ids: string[],
): Promise<{ saved: number; limitHit: boolean; failed: boolean }> {
  const want = new Set(ids);
  const rows: { handle: string; tokens: MetaTokens | FacebookTokens; displayName: string | null; avatarUrl: string | null }[] =
    pick.platform === "instagram"
      ? (await listInstagramAccounts(pick.userToken))
          .filter((a) => want.has(a.igUserId))
          .map((a) => ({
            handle: handleFor("instagram", { username: a.username, name: a.name ?? "", id: a.igUserId }),
            tokens: {
              access_token: a.pageAccessToken, // Page tokens from a long-lived user token don't expire
              ig_user_id: a.igUserId,
              page_id: a.pageId,
              user_access_token: pick.userToken,
            },
            displayName: a.name ?? null,
            avatarUrl: a.avatarUrl ?? null,
          }))
      : (await resolvePages(pick.userToken))
          .filter((pg) => want.has(pg.id))
          .map((pg) => ({
            handle: handleFor("facebook", pg),
            tokens: {
              access_token: pg.access_token,
              page_id: pg.id,
              page_name: pg.name,
              user_access_token: pick.userToken,
            },
            displayName: pg.name,
            avatarUrl: pg.avatarUrl ?? null,
          }));

  let saved = 0;
  let limitHit = false;
  let failed = false;
  for (const r of rows) {
    const fields = {
      encrypted_tokens: encryptJson(r.tokens),
      token_expiry: pick.tokenExpiry,
      status: "active",
      display_name: r.displayName,
      avatar_url: r.avatarUrl,
      // App-scoped FB user id — lets the deauthorize/data-deletion callbacks
      // find these channels, and disconnect tell whether the login is shared.
      provider_user_id: pick.fbUserId,
    };
    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("platform", pick.platform)
      .eq("handle", r.handle)
      .maybeSingle();
    if (!existing && (await atChannelLimit(supabase, orgId))) {
      limitHit = true;
      break;
    }
    const { error } = existing
      ? await supabase.from("channels").update(fields).eq("id", existing.id)
      : await supabase.from("channels").insert({ org_id: orgId, platform: pick.platform, handle: r.handle, ...fields });
    if (error) failed = true;
    else saved++;
  }
  return { saved, limitHit, failed };
}
