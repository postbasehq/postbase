import { AgentChat, type AgentChannel } from "@/components/AgentChat";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { agentUsage, aiUsage, billingGroup } from "@/lib/billing-guard";
import { PLANS } from "@/lib/plans";
import type { AgentUsageInfo } from "@/components/AgentUsageRing";
import { higgsfieldConfigured } from "@/lib/higgsfield";
import { listConversations } from "./history-actions";

export const metadata = { title: "Agent" };

export default async function AgentPage() {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();

  // RLS covers every workspace the user is in; filter to the active one.
  const { data } = await supabase
    .from("channels")
    .select("id, platform, handle, display_name, avatar_url, verified")
    .eq("org_id", orgId ?? "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: true });
  const channels: AgentChannel[] = (data ?? []).map((c) => ({
    id: c.id,
    platform: c.platform,
    handle: c.handle,
    displayName: c.display_name,
    avatarUrl: c.avatar_url,
    verified: c.verified,
  }));

  // Only surface image credits when image generation is actually available.
  const imageGenReady = higgsfieldConfigured();
  const [usage, ai, group, conversations] = await Promise.all([
    orgId ? agentUsage(supabase, orgId) : Promise.resolve(null),
    orgId ? aiUsage(supabase, orgId) : Promise.resolve(null),
    orgId ? billingGroup(orgId) : Promise.resolve(null),
    listConversations(),
  ]);
  const images = imageGenReady ? (ai?.image ?? null) : null;
  const now = new Date();
  // Everything the plan-usage ring shows.
  const usageInfo: AgentUsageInfo = {
    planName: group && group.plan !== "trial" ? PLANS[group.plan].name : null,
    images: images ? { used: images.used, limit: images.limit } : null,
    videos: imageGenReady && ai ? { used: ai.video.used, limit: ai.video.limit } : null,
    resets: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
    workspaces: group?.orgIds.length ?? 1,
  };

  const modelsReady = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  };

  return (
    <div className="h-full">
      <AgentChat
        channels={channels}
        conversations={conversations}
        remaining={usage?.remainingToday ?? null}
        limit={usage?.dailyCap ?? null}
        usage={usageInfo}
        imagesRemaining={images?.remaining ?? null}
        imagesLimit={images?.limit ?? null}
        modelsReady={modelsReady}
      />
    </div>
  );
}
