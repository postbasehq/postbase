import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { loadBot, recentMessages, toBot } from "@/lib/postbots/store";
import { BotChat } from "@/components/postbots/BotChat";

export default async function BotPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const orgId = await getCurrentOrgId();
  const row = orgId ? await loadBot(orgId, botId) : null;
  if (!row) notFound();
  const supabase = await createClient();
  const [messages, { data: channels }] = await Promise.all([
    recentMessages(row.id),
    supabase.from("channels").select("id, platform, handle").eq("org_id", row.org_id).order("created_at", { ascending: true }),
  ]);
  return <BotChat key={row.id} bot={toBot(row)} initialMessages={messages} channels={channels ?? []} />;
}
