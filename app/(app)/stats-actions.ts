"use server";

import { getCurrentOrgId } from "@/lib/org";
import { refreshXMetrics } from "@/lib/analytics/collect";

/**
 * Called when someone opens a post's stats: refreshes its X metrics if they're
 * over an hour old (X reads are billed, so they're never polled in the background).
 */
export async function refreshPostStats(postId: string): Promise<{ refreshed: number }> {
  const orgId = await getCurrentOrgId();
  if (!orgId || !postId) return { refreshed: 0 };
  return { refreshed: await refreshXMetrics(orgId, postId) };
}
