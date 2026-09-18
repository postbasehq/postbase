"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId, getOrgRole } from "@/lib/org";
import { getClient, issueCode } from "@/lib/oauth";

/** Build a redirect back to the client with query params appended. */
function backTo(redirectUri: string, params: Record<string, string>): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url.toString();
}

/** Re-enter the consent page with the original params — used when the client
 *  can no longer be validated (e.g. it was re-registered), so the user sees the
 *  friendly "reconnect from your tool" card instead of a raw runtime error. */
function reAuthorizeUrl(formData: FormData): string {
  const qs = new URLSearchParams();
  for (const k of [
    "response_type",
    "client_id",
    "redirect_uri",
    "code_challenge",
    "code_challenge_method",
    "state",
    "scope",
    "resource",
  ]) {
    const v = String(formData.get(k) ?? "");
    if (v) qs.set(k, v);
  }
  if (!qs.get("response_type")) qs.set("response_type", "code");
  return `/oauth/authorize?${qs.toString()}`;
}

/**
 * Approve an authorization request: mint a single-use code bound to the signed-in
 * user's org and the client's PKCE challenge, then redirect back to the client.
 * Identity (org/user) comes from the session — never from the submitted form.
 */
export async function approveAuthorization(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const codeChallengeMethod = String(formData.get("code_challenge_method") ?? "S256");
  const state = String(formData.get("state") ?? "");
  const scope = String(formData.get("scope") ?? "");
  const resource = String(formData.get("resource") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve the workspace to authorize: the picked one if the user is actually a
  // member of it (never trust the form), else their active/default org.
  const requestedOrg = String(formData.get("org_id") ?? "");
  let orgId: string | null = null;
  if (requestedOrg && (await getOrgRole(requestedOrg))) {
    orgId = requestedOrg;
  } else {
    orgId = await getCurrentOrgId();
  }
  if (!orgId) redirect("/login");

  // Re-verify the client + redirect_uri server-side before issuing anything.
  // If it can't be validated (e.g. the client was re-registered between render
  // and submit), bounce to the consent page which shows a friendly reconnect
  // message rather than throwing a runtime error.
  const client = await getClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    redirect(reAuthorizeUrl(formData));
  }

  const code = await issueCode({
    clientId,
    orgId: orgId!,
    userId: user!.id,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope: scope || undefined,
    resource: resource || undefined,
  });

  redirect(backTo(redirectUri, { code, state }));
}

/** Deny: bounce back to the client with an OAuth error, no code issued. */
export async function denyAuthorization(formData: FormData) {
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const clientId = String(formData.get("client_id") ?? "");

  const client = await getClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    redirect(reAuthorizeUrl(formData));
  }
  redirect(backTo(redirectUri, { error: "access_denied", state }));
}
