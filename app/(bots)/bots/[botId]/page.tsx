import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { loadBot, recentMessages, toBot } from "@/lib/postbots/store";
import { BotChat } from "@/components/postbots/BotChat";

// One lookup shared by the tab title and the page.
const botFor = cache(async (botId: string) => {
  const orgId = await getCurrentOrgId();
  return orgId ? loadBot(orgId, botId) : null;
});

/** The tab reads "<bot name> · Postbots". */
export async function generateMetadata({ params }: { params: Promise<{ botId: string }> }): Promise<Metadata> {
  const row = await botFor((await params).botId);
  return row ? { title: row.name } : {};
}

export default async function BotPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const row = await botFor(botId);
  if (!row) notFound();
  const supabase = await createClient();
  const [messages, { data: channels }] = await Promise.all([
    recentMessages(row.id),
    supabase.from("channels").select("id, platform, handle").eq("org_id", row.org_id).order("created_at", { ascending: true }),
  ]);
  return <BotChat key={row.id} bot={toBot(row)} initialMessages={messages} channels={channels ?? []} />;
}
