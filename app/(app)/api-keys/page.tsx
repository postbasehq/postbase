import { createClient } from "@/lib/supabase/server";
import { getUserOrgs, scopeOrgId } from "@/lib/org";
import { DeveloperClient } from "@/components/DeveloperClient";
import { publicMcpUrl, listConnectedApps } from "@/lib/oauth";

export default async function DevelopersPage() {
  const supabase = await createClient();
  const orgId = await scopeOrgId();
  // Never select hashed_key.
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, label, key_hint, created_at, last_used_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const connectedApps = user ? (await listConnectedApps(user.id)).filter((a) => a.orgId === orgId) : [];

  // Keys and connections belong to one workspace; say which, since plans cover several.
  const orgs = await getUserOrgs();
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
        keys={keys ?? []}
        mcpUrl={publicMcpUrl()}
        connectedApps={connectedApps}
        workspace={workspace}
      />
    </div>
  );
}
