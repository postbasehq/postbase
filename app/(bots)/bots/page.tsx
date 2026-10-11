import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scopeOrgId } from "@/lib/org";
import { FirstBot } from "@/components/postbots/BotsEmpty";
import { botsHref } from "@/lib/hosts";

/** Opens your most recent bot, or invites you to make one. */
export default async function BotsHome() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("id")
    .eq("org_id", await scopeOrgId())
    .order("updated_at", { ascending: false })
    .limit(1);
  if (data?.[0]) redirect(botsHref(`/bots/${data[0].id}`));
  return <FirstBot />;
}
