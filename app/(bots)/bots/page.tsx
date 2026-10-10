import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scopeOrgId } from "@/lib/org";
import { BotAvatar } from "@/components/postbots/BotAvatar";
import { NewBotButton } from "@/components/postbots/NewBotButton";

/** Opens your most recent bot, or invites you to make one. */
export default async function BotsHome() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bots")
    .select("id")
    .eq("org_id", await scopeOrgId())
    .order("updated_at", { ascending: false })
    .limit(1);
  if (data?.[0]) redirect(`/bots/${data[0].id}`);
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <BotAvatar color="blue" size={88} />
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">Make your first bot</h1>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
        Tell it what you need in chat. It sets itself up, gets on with the job, and messages you when there&apos;s something to look at.
      </p>
      <NewBotButton className="mt-6 rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm">
        New bot
      </NewBotButton>
    </div>
  );
}
