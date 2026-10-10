"use server";

import { revalidatePath } from "next/cache";
import { canManageOrg, getCurrentOrgId, getOrgRole, getSessionUser } from "@/lib/org";
import { createEndpoint, deleteEndpoint, getEndpoint, sendTestEvent } from "@/lib/webhooks";

export type CreateWebhookState = { secret?: string; url?: string; error?: string };

/** Add a webhook endpoint for the active workspace. Returns its signing secret ONCE. */
export async function createWebhook(_prev: CreateWebhookState, formData: FormData): Promise<CreateWebhookState> {
  const [orgId, user] = await Promise.all([getCurrentOrgId(), getSessionUser()]);
  if (!orgId || !user) return { error: "No workspace found for this user." };
  if (!(await getOrgRole(orgId))) return { error: "You're not a member of this workspace." };
  try {
    const { endpoint, secret } = await createEndpoint(orgId, {
      url: String(formData.get("url") ?? ""),
      events: formData.getAll("events").map(String),
      description: String(formData.get("description") ?? "") || null,
      createdBy: user.id,
    });
    revalidatePath("/api-keys");
    return { secret, url: endpoint.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't add the webhook." };
  }
}

/** Whoever added an endpoint, or an owner or admin, can delete it. */
export async function deleteWebhook(formData: FormData) {
  const [orgId, user] = await Promise.all([getCurrentOrgId(), getSessionUser()]);
  if (!orgId || !user) throw new Error("No workspace found for this user.");
  const id = String(formData.get("id") ?? "");
  const endpoint = await getEndpoint(orgId, id);
  if (!endpoint) return;
  const role = await getOrgRole(orgId);
  if (!canManageOrg(role) && endpoint.created_by !== user.id) {
    throw new Error("Only the person who added this webhook, or an owner or admin, can delete it.");
  }
  await deleteEndpoint(orgId, id);
  revalidatePath("/api-keys");
}

export type TestResult = { delivered: boolean; response_status: number | null; error: string | null } | { error: string };

export async function testWebhook(id: string): Promise<TestResult> {
  const orgId = await getCurrentOrgId();
  if (!orgId || !(await getOrgRole(orgId))) return { error: "No workspace found for this user." };
  try {
    const r = await sendTestEvent(orgId, id);
    revalidatePath("/api-keys");
    return r ?? { error: "Webhook not found." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't send the test." };
  }
}
