import { createAdminClient } from "@/lib/supabase/admin";
import { billingEnforced, billingGroup } from "@/lib/billing-guard";
import { X_LINK_LIMIT } from "@/lib/plans";
import { countXLinkPosts } from "@/lib/x-link-count";

/*
 * The monthly allowance of X posts with links (lib/plans.ts X_LINK_LIMIT),
 * shared across a plan's workspaces. Enforced by the publisher at send time
 * (lib/publish/run.ts) — the only code that posts to X — so no path (composer,
 * API, MCP, agent, repeats, retries) can skip it. Schedule-time warnings are
 * advisory. Usage rows are service-role only (migration 0042).
 */

/** Start of the current allowance month (UTC). */
export function xLinkPeriodStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** When the allowance next resets (1st of next month, UTC). */
export function xLinkResetsAt(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export const formatResetDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export type XLinkUsage = {
  /** False on self-hosted installs (no billing): no limit applies. */
  enforced: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
};

export async function xLinkUsage(orgId: string): Promise<XLinkUsage> {
  const resetsAt = xLinkResetsAt().toISOString();
  if (!billingEnforced()) return { enforced: false, used: 0, limit: Infinity, remaining: Infinity, resetsAt };
  const g = await billingGroup(orgId);
  const db = createAdminClient();
  const { data } = await db
    .from("x_link_usage")
    .select("count")
    .eq("root_org_id", g.rootId)
    .gte("created_at", xLinkPeriodStart().toISOString());
  const used = (data ?? []).reduce((n, r) => n + (r.count as number), 0);
  const limit = X_LINK_LIMIT[g.usagePlan] ?? X_LINK_LIMIT.trial;
  return { enforced: true, used, limit, remaining: Math.max(0, limit - used), resetsAt };
}

export type Reservation =
  | { ok: true; id: string | null }
  | { ok: false; error: string; transient?: boolean };

/**
 * Atomically take `count` link posts from the plan's allowance for one send.
 * All or nothing, so a thread never goes out half-way because the allowance
 * ran out mid-thread.
 */
export async function reserveXLinks(orgId: string, targetId: string, count: number): Promise<Reservation> {
  if (count <= 0 || !billingEnforced()) return { ok: true, id: null };
  // Fail closed but transient: if the check itself errors, don't send; the
  // publisher puts the target back and the next run checks again.
  const unavailable = { ok: false, error: "Couldn't check your X link allowance. It will be retried.", transient: true } as const;
  let g: Awaited<ReturnType<typeof billingGroup>>;
  try {
    g = await billingGroup(orgId);
  } catch {
    return unavailable;
  }
  const limit = X_LINK_LIMIT[g.usagePlan] ?? X_LINK_LIMIT.trial;
  const db = createAdminClient();
  const { data, error } = await db.rpc("reserve_x_links", {
    p_root: g.rootId,
    p_org: orgId,
    p_target: targetId,
    p_count: count,
    p_limit: limit,
    p_since: xLinkPeriodStart().toISOString(),
  });
  if (error) return unavailable;
  if (!data) return { ok: false, error: overLimitMessage(limit, count, g.pastDue ? "past_due" : g.trialing ? "trial" : "plan") };
  return { ok: true, id: data as string };
}

/**
 * Settle a reservation with how many link posts actually went out: give back
 * the rest (a send that failed part-way only uses what was posted).
 */
export async function settleXLinks(id: string | null, actual: number): Promise<void> {
  if (!id) return;
  const db = createAdminClient();
  if (actual <= 0) await db.from("x_link_usage").delete().eq("id", id);
  else await db.from("x_link_usage").update({ count: actual }).eq("id", id);
}

export function overLimitMessage(limit: number, needed = 1, mode: "plan" | "trial" | "past_due" = "plan"): string {
  const what = needed > 1 ? `This thread has ${needed} posts with links, and your` : "Your";
  if (mode === "past_due") {
    return `Your last payment didn't go through, so X posts with links are limited to ${limit} this month${needed > 1 ? ` (this thread has ${needed})` : ""}. Update your card on the Billing page, then hit Retry. Posts without links are unlimited.`;
  }
  if (mode === "trial") {
    return `${what} free trial's ${limit} X posts with links are used up. Remove the link and hit Retry, or start your plan early on the Billing page for its full allowance. Posts without links are unlimited.`;
  }
  return `${what} plan's ${limit} X posts with links for this month are used up. Remove the link and hit Retry, or retry after ${formatResetDate(xLinkResetsAt())} when the allowance resets. Posts without links are unlimited.`;
}

/**
 * Schedule-time advice for a post going to X: null when it has no links, is
 * scheduled for a later month, or fits the allowance.
 */
export async function xLinkWarning(orgId: string, linkPosts: number, scheduledAt: string | null): Promise<string | null> {
  if (linkPosts <= 0) return null;
  if (scheduledAt && Date.parse(scheduledAt) >= xLinkResetsAt().getTime()) return null;
  const u = await xLinkUsage(orgId);
  if (!u.enforced) return null;
  if (u.remaining >= linkPosts) return null;
  return `X: this post has ${linkPosts === 1 ? "a link" : `${linkPosts} posts with links`}, and only ${u.remaining} of your ${u.limit} X posts with links are left this month. It will fail when due unless you remove the link${linkPosts > 1 ? "s" : ""} or it goes out after ${formatResetDate(xLinkResetsAt())}.`;
}

/**
 * The warning for a post about to be scheduled to these channels, counting each
 * X account's copy (its variant if it has one, else the shared texts).
 */
export async function xLinkWarningFor(
  orgId: string,
  channelIds: string[],
  texts: string[],
  scheduledAt: string | null,
  variants: Record<string, string> = {},
): Promise<string | null> {
  if (channelIds.length === 0 || !billingEnforced()) return null;
  const db = createAdminClient();
  const { data } = await db.from("channels").select("id").eq("org_id", orgId).eq("platform", "x").in("id", channelIds);
  const needed = (data ?? []).reduce(
    (n, c) => n + countXLinkPosts(variants[c.id as string]?.trim() ? [variants[c.id as string]] : texts),
    0,
  );
  return xLinkWarning(orgId, needed, scheduledAt);
}
