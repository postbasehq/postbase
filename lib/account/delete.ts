import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { r2Client, r2Bucket } from "@/lib/r2";
import { MEDIA_BUCKET } from "@/lib/media-storage";
import { revokeChannelAccess } from "@/lib/channel-revoke";

/*
 * Self-serve account deletion (Settings → Delete account). In order:
 *  1. Plan: workspaces only this user is in are deleted outright; workspaces
 *     shared with others are left (membership removed). Deletion is refused if
 *     the user is the only owner of a workspace that has other people in it
 *     (they'd be stranded), or if a workspace to delete pays for another
 *     workspace that isn't being deleted (it would lose its plan).
 *  2. Cancel every deleted workspace's Stripe subscription first (stop if one
 *     fails, before anything is deleted). Then each: revoke every
 *     channel's access on the network, remove its files (post-media bucket,
 *     R2 media library), its OAuth tokens/codes, then the org row (every
 *     org-scoped table cascades).
 *  3. Left workspaces: membership, OAuth tokens/codes and API keys go.
 *  4. Invites and waitlist rows holding their email go, then the auth user
 *     (memberships, API keys, sessions cascade; posts they wrote in shared
 *     workspaces stay with that workspace, with the author removed).
 */

type Db = ReturnType<typeof createAdminClient>;

export type DeletionPlan = {
  /** Workspaces deleted with the account (only this user is in them). */
  purge: { id: string; name: string }[];
  /** Shared workspaces the user simply leaves. */
  leave: { id: string; name: string }[];
  /** Reasons the account can't be deleted yet; empty when it can. */
  blockers: string[];
};

export async function planAccountDeletion(userId: string): Promise<DeletionPlan> {
  const db = createAdminClient();
  const { data: mine, error } = await db.from("org_members").select("org_id, role, orgs(id, name)").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const orgIds = (mine ?? []).map((m) => m.org_id as string);
  const { data: everyone } = orgIds.length
    ? await db.from("org_members").select("org_id, user_id, role").in("org_id", orgIds)
    : { data: [] as { org_id: string; user_id: string; role: string }[] };

  const plan: DeletionPlan = { purge: [], leave: [], blockers: [] };
  for (const m of mine ?? []) {
    const org = m.orgs as unknown as { id: string; name: string } | null;
    if (!org) continue;
    const others = (everyone ?? []).filter((e) => e.org_id === org.id && e.user_id !== userId);
    if (others.length === 0) {
      plan.purge.push(org);
    } else if (m.role === "owner" && !others.some((o) => o.role === "owner")) {
      plan.blockers.push(
        `You're the only owner of “${org.name}”, which has ${others.length} other ${others.length === 1 ? "person" : "people"} in it. Remove them from the workspace's Team page first, or ask us to transfer ownership.`,
      );
    } else {
      plan.leave.push(org);
    }
  }

  // A workspace being deleted mustn't be paying for one that stays.
  const purgeIds = new Set(plan.purge.map((o) => o.id));
  if (purgeIds.size) {
    const { data: dependants } = await db.from("orgs").select("id, name, billing_org_id").in("billing_org_id", [...purgeIds]);
    for (const d of dependants ?? []) {
      if (!purgeIds.has(d.id as string)) {
        const payer = plan.purge.find((o) => o.id === d.billing_org_id)?.name ?? "a workspace";
        plan.blockers.push(`“${d.name}” is on ${payer}'s plan, which would end. Leave or remove “${d.name}” first.`);
      }
    }
  }
  return plan;
}

/** Cancel the workspace's subscription now. Throws if Stripe refuses, to stop the deletion. */
async function cancelSubscription(db: Db, orgId: string): Promise<void> {
  const { data: org } = await db.from("orgs").select("stripe_subscription_id, subscription_status").eq("id", orgId).maybeSingle();
  const sub = org?.stripe_subscription_id as string | null;
  if (!sub || org?.subscription_status === "canceled" || !stripeConfigured()) return;
  try {
    await getStripe().subscriptions.cancel(sub, { prorate: false });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "resource_missing") return; // already gone in Stripe
    throw new Error(`Couldn't cancel the subscription for this workspace, so nothing was deleted. Try again, or email team@postbase.so. (${e instanceof Error ? e.message : code})`);
  }
}

/** Every post-media file under uploads|agent|ai/<org>/ (flat folders). */
async function removeBucketFiles(db: Db, orgId: string): Promise<void> {
  for (const prefix of ["uploads", "agent", "ai"]) {
    const folder = `${prefix}/${orgId}`;
    for (let round = 0; round < 100; round++) {
      const { data, error } = await db.storage.from(MEDIA_BUCKET).list(folder, { limit: 1000 });
      if (error || !data?.length) break;
      const paths = data.filter((f) => f.id).map((f) => `${folder}/${f.name}`);
      if (!paths.length) break;
      const { error: rmError } = await db.storage.from(MEDIA_BUCKET).remove(paths);
      if (rmError) {
        console.error(`[delete] post-media ${folder}: ${rmError.message}`);
        break;
      }
    }
  }
}

/** Every R2 media-library object under <org>/. */
async function removeR2Files(orgId: string): Promise<void> {
  let client;
  let Bucket: string;
  try {
    client = r2Client();
    Bucket = r2Bucket();
  } catch {
    return; // R2 not configured on this deployment
  }
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket, Prefix: `${orgId}/`, ContinuationToken: token, MaxKeys: 1000 }));
    const keys = (page.Contents ?? []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key);
    if (keys.length) await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys, Quiet: true } }));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

/**
 * Delete a workspace and everything in it. Cancels its subscription first
 * unless the caller already did (account deletion cancels every workspace's
 * subscription before deleting anything, so a Stripe failure can't leave the
 * account half-deleted).
 */
export async function purgeWorkspace(orgId: string, opts: { billingCancelled?: boolean } = {}): Promise<void> {
  const db = createAdminClient();
  if (!opts.billingCancelled) await cancelSubscription(db, orgId);

  const { data: channels } = await db.from("channels").select("id, org_id, platform, encrypted_tokens, provider_user_id").eq("org_id", orgId);
  for (const ch of channels ?? []) await revokeChannelAccess(ch, { orgId });

  await removeBucketFiles(db, orgId).catch((e) => console.error(`[delete] files for ${orgId}:`, e));
  await removeR2Files(orgId).catch((e) => console.error(`[delete] R2 for ${orgId}:`, e));

  await db.from("oauth_tokens").delete().eq("org_id", orgId);
  await db.from("oauth_codes").delete().eq("org_id", orgId);
  const { error } = await db.from("orgs").delete().eq("id", orgId);
  if (error) throw new Error(`Couldn't delete the workspace: ${error.message}`);
}

/** Leave a shared workspace: membership plus this user's programmatic access there. */
async function leaveWorkspace(db: Db, orgId: string, userId: string): Promise<void> {
  await db.from("org_members").delete().eq("org_id", orgId).eq("user_id", userId);
  await Promise.all([
    db.from("oauth_tokens").delete().eq("org_id", orgId).eq("user_id", userId),
    db.from("oauth_codes").delete().eq("org_id", orgId).eq("user_id", userId),
    db.from("api_keys").delete().eq("org_id", orgId).eq("created_by", userId),
  ]);
}

/** Delete the account per the plan. Throws (having changed nothing) if there are blockers. */
export async function deleteAccount(userId: string, email: string): Promise<DeletionPlan> {
  const plan = await planAccountDeletion(userId);
  if (plan.blockers.length) throw new Error(plan.blockers[0]);
  const db = createAdminClient();

  // Stop every subscription before deleting anything: if Stripe refuses one,
  // nothing has been deleted yet and the person can simply try again.
  for (const org of plan.purge) await cancelSubscription(db, org.id);
  for (const org of plan.purge) await purgeWorkspace(org.id, { billingCancelled: true });
  for (const org of plan.leave) await leaveWorkspace(db, org.id, userId);

  // Anything left keyed to the user (OAuth has no foreign keys) or holding
  // their email (invites to them in other workspaces, waitlist sign-ups made
  // before signing in), then the user.
  await db.from("oauth_tokens").delete().eq("user_id", userId);
  await db.from("oauth_codes").delete().eq("user_id", userId);
  // Exact matches only: ilike would treat "_" and "%" in an address as
  // wildcards and could delete someone else's rows.
  const addresses = [...new Set([email, email.toLowerCase()])];
  await db.from("org_invites").delete().in("email", addresses);
  await db.from("platform_waitlist").delete().in("email", addresses);
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Couldn't delete the account: ${error.message}`);
  return plan;
}
