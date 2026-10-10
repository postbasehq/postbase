import { createClient } from "@/lib/supabase/server";
import { canManageOrg, getOrgRole, getUserOrgs, scopeOrgId, getSessionUser } from "@/lib/org";
import { DeveloperClient } from "@/components/DeveloperClient";
import { publicMcpUrl, listConnectedApps } from "@/lib/oauth";
import { listEndpoints, WEBHOOK_EVENTS, WEBHOOK_EVENT_LABELS } from "@/lib/webhooks";

export default async function DevelopersPage() {
  const supabase = await createClient();
  const orgId = await scopeOrgId();
  const loadConnectedApps = async () => {
    const user = await getSessionUser();
    return user ? (await listConnectedApps(user.id)).filter((a) => a.orgId === orgId) : [];
  };

  // Everything at once: each is a round trip to the database.
  const [{ data: keys }, user, role, connectedApps, orgs, endpoints] = await Promise.all([
    // Never select hashed_key.
    supabase
      .from("api_keys")
      .select("id, label, key_hint, created_at, last_used_at, created_by")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    getSessionUser(),
    orgId ? getOrgRole(orgId) : null,
    loadConnectedApps(),
    getUserOrgs(),
    orgId ? listEndpoints(orgId) : [],
  ]);

  const manager = orgId ? canManageOrg(role) : false;
  const webhooks = endpoints.map(({ created_by, created_at: _c, ...w }) => ({ ...w, canManage: manager || (!!user && created_by === user.id) }));
  const rows = (keys ?? []).map(({ created_by, ...k }) => ({ ...k, canManage: manager || (!!user && created_by === user.id) }));

  // Keys and connections belong to one workspace; say which, since plans cover several.
  const workspace = orgs.find((o) => o.id === orgId)?.name ?? "this workspace";

  return (
    <div>
      {/* Only worth saying when there's more than one workspace a key could belong to. */}
      {orgs.length > 1 ? (
        <p className="mb-4 text-[13px] text-muted">
          Showing keys and AI tools for <span className="font-semibold text-ink">{workspace}</span>. Switch workspace in
          the sidebar to manage another.
        </p>
      ) : null}
      <DeveloperClient
        keys={rows}
        mcpUrl={publicMcpUrl()}
        connectedApps={connectedApps}
        workspace={workspace}
        webhooks={webhooks}
        webhookEvents={WEBHOOK_EVENTS.map((value) => ({ value, label: WEBHOOK_EVENT_LABELS[value] }))}
      />
    </div>
  );
}
