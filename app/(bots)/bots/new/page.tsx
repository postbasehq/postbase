import { createClient } from "@/lib/supabase/server";
import { scopeOrgId } from "@/lib/org";
import { NewChat, type PickerBot } from "@/components/postbots/NewChat";

export const metadata = { title: "New chat" };

/** "+": pick a bot to chat with, or name and start a new one. */
export default async function NewChatPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("id, name, color")
    .eq("org_id", await scopeOrgId())
    .order("updated_at", { ascending: false });
  return <NewChat bots={(data ?? []) as PickerBot[]} />;
}
