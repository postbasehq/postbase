import { AgentChat, type AgentChannel } from "@/components/AgentChat";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { agentUsage } from "@/lib/billing-guard";
import { listConversations } from "./history-actions";

export const metadata = { title: "Agent · Postbase" };

export default async function AgentPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();

  // RLS scopes this to the user's active org's channels.
  const { data } = await supabase
    .from("channels")
    .select("id, platform, handle, display_name, avatar_url, verified")
    .order("created_at", { ascending: true });
  const channels: AgentChannel[] = (data ?? []).map((c) => ({
    id: c.id,
    platform: c.platform,
    handle: c.handle,
    displayName: c.display_name,
    avatarUrl: c.avatar_url,
    verified: c.verified,
  }));

  const [usage, conversations] = await Promise.all([
    orgId ? agentUsage(supabase, orgId) : Promise.resolve(null),
    listConversations(),
  ]);

  const modelsReady = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  };

  return (
    <div className="h-full">
      <AgentChat
        channels={channels}
        conversations={conversations}
        remaining={usage?.remaining ?? null}
        limit={usage?.limit ?? null}
        modelsReady={modelsReady}
      />
    </div>
  );
}
