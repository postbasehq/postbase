import { createClient } from "@/lib/supabase/server";
import { scopeOrgId } from "@/lib/org";
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

  return (
    <div>
      <p className="max-w-2xl text-sm text-muted">
        Use your API key to automate Postbase — hook up an AI agent over MCP, script it from the
        CLI, or call the REST API directly.
      </p>

      <div className="mt-6">
        <DeveloperClient
          keys={keys ?? []}
          mcpUrl={publicMcpUrl()}
          connectedApps={connectedApps}
        />
      </div>
    </div>
  );
}
