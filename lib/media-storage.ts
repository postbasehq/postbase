import { createAdminClient } from "@/lib/supabase/admin";
import { billingEnforced, billingGroup, hasAccess, NO_PLAN_MESSAGE } from "@/lib/billing-guard";
import { STORAGE_LIMIT_BYTES } from "@/lib/plans";

/*
 * Uploads to the public post-media bucket. Browsers can't write to it directly
 * (migration 0044); every upload goes through here: active plan or trial,
 * allowed type and size, the plan's storage allowance, and a path scoped to
 * the workspace (uploads|agent|ai/<org_id>/…) so usage can be counted.
 */

export const MEDIA_BUCKET = "post-media";
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // matches the bucket's own limit

export const UPLOAD_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

const formatGb = (bytes: number) => `${Math.round(bytes / 1024 ** 3)} GB`;

export async function storageUsage(orgId: string): Promise<{ used: number; limit: number }> {
  const g = await billingGroup(orgId);
  const { data } = await createAdminClient().rpc("media_storage_bytes", { p_orgs: g.orgIds });
  return { used: Number(data ?? 0), limit: STORAGE_LIMIT_BYTES[g.plan] ?? STORAGE_LIMIT_BYTES.trial };
}

/** Why this workspace can't store `size` more bytes, or null if it can. */
export async function uploadBlocker(orgId: string, type: string, size: number, maxBytes = MAX_UPLOAD_BYTES): Promise<string | null> {
  if (!UPLOAD_EXT[type]) return "That file type isn't supported. Use JPG, PNG, WebP, GIF, MP4 or MOV.";
  if (!Number.isFinite(size) || size <= 0) return "That file looks empty.";
  if (size > maxBytes) return `That file is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`;
  return storageBlocker(orgId, size);
}

/**
 * Plan + allowance check shared by post-media uploads and the R2 media library:
 * an active plan or trial, and room for `size` more bytes.
 */
export async function storageBlocker(orgId: string, size: number): Promise<string | null> {
  if (!(await hasAccess(createAdminClient(), orgId))) return NO_PLAN_MESSAGE;
  if (!billingEnforced()) return null;
  const u = await storageUsage(orgId);
  if (u.used + size > u.limit) {
    return `Your plan's ${formatGb(u.limit)} of media storage is full. Delete files or posts you no longer need, or upgrade in Billing.`;
  }
  return null;
}

/** A fresh workspace-scoped path in the bucket. */
export function mediaPath(prefix: "uploads" | "agent" | "ai", orgId: string, type: string): string {
  return `${prefix}/${orgId}/${crypto.randomUUID()}.${UPLOAD_EXT[type] ?? "bin"}`;
}
