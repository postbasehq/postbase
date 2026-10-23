import { createClient } from "@/lib/supabase/server";
import { scopeOrgId } from "@/lib/org";
import { TeamInbox, type InboxItem } from "@/components/postbots/TeamInbox";
import { BOT_COLORS, type BotCard, type BotColor } from "@/lib/postbots/types";

export const metadata = { title: "Inbox" };

/** The most open items shown at once; the rest wait until these are cleared. */
const LIMIT = 50;

/** The team inbox: every draft and set of findings your bots prepared, newest first. */
export default async function InboxPage() {
  const supabase = await createClient();
  const orgId = await scopeOrgId();
  const { data: rows } = await supabase
    .from("bot_inbox")
    .select("id, bot_id, message_id, card_index, created_at")
    .eq("org_id", orgId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  const open = rows ?? [];

  const [{ data: messages }, { data: bots }, { data: channels }] = await Promise.all([
    open.length
      ? supabase.from("bot_messages").select("id, content, cards").in("id", [...new Set(open.map((r) => r.message_id))])
      : Promise.resolve({ data: [] as { id: string; content: string; cards: unknown }[] }),
    open.length
      ? supabase.from("bots").select("id, name, color").in("id", [...new Set(open.map((r) => r.bot_id))])
      : Promise.resolve({ data: [] as { id: string; name: string; color: string }[] }),
    supabase.from("channels").select("id, platform, handle").eq("org_id", orgId).order("created_at", { ascending: true }),
  ]);
  const messageById = new Map((messages ?? []).map((m) => [m.id, m]));
  const botById = new Map((bots ?? []).map((b) => [b.id, b]));

  const items: InboxItem[] = open.flatMap((r) => {
    const m = messageById.get(r.message_id);
    const b = botById.get(r.bot_id);
    const card = Array.isArray(m?.cards) ? (m.cards as BotCard[])[r.card_index] : undefined;
    if (!m || !b || !card || (card.type !== "draft" && card.type !== "findings")) return [];
    return [
      {
        id: r.id,
        messageId: r.message_id,
        cardIndex: r.card_index,
        createdAt: r.created_at,
        text: (m.content ?? "").replace(/[*_`#>]/g, "").trim(),
        card,
        bot: { id: b.id, name: b.name, color: (b.color in BOT_COLORS ? b.color : "blue") as BotColor },
      },
    ];
  });

  return <TeamInbox items={items} channels={channels ?? []} />;
}
