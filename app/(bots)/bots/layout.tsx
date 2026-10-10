import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BotsShell } from "@/components/postbots/BotsShell";
import type { SidebarBot } from "@/components/postbots/BotsSidebar";
import { TimezoneSync } from "@/components/TimezoneSync";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId, getSessionUser } from "@/lib/org";
import { needsTwoFactor, VERIFY_PATH } from "@/lib/mfa";
import { billingEnforced, billingGroup, orgHasAccess } from "@/lib/billing-guard";
import { BOT_COLUMNS, toBot, type BotRow } from "@/lib/postbots/store";

export const metadata: Metadata = {
  title: { default: "Postbots", template: "%s · Postbots" },
  robots: { index: false, follow: false },
};

export default async function BotsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/bots");
  const supabase = await createClient();
  if (await needsTwoFactor(supabase, user)) redirect(VERIFY_PATH);

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const profile = {
    name: (meta.full_name as string) || (meta.name as string) || (meta.user_name as string) || "",
    email: user.email ?? "",
    avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || undefined,
  };

  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/calendar");
  if (billingEnforced() && !orgHasAccess(await billingGroup(orgId))) {
    return (
      <div className="flex h-dvh items-center justify-center bg-ground px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Postbots come with your Postbase plan</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">Pick a plan to hire bots that listen, draft and report for you.</p>
          <Link href="/billing" className="mt-6 inline-block rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue">
            See plans
          </Link>
        </div>
      </div>
    );
  }

  // RLS covers every workspace the user is in; show the active one's bots.
  const [{ data: rows }, { data: latest }] = await Promise.all([
    supabase.from("bots").select(BOT_COLUMNS).eq("org_id", orgId).order("updated_at", { ascending: false }),
    supabase
      .from("bot_messages")
      .select("bot_id, role, content, cards, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const lastByBot = new Map<string, { role: string; content: string; cards: unknown; created_at: string }>();
  const lastBotAt = new Map<string, string>();
  for (const m of latest ?? []) {
    if (!lastByBot.has(m.bot_id)) lastByBot.set(m.bot_id, m);
    if (m.role === "bot" && !lastBotAt.has(m.bot_id)) lastBotAt.set(m.bot_id, m.created_at);
  }
  const bots: SidebarBot[] = ((rows ?? []) as BotRow[]).map((r) => {
    const b = toBot(r);
    const last = lastByBot.get(b.id);
    const cards = Array.isArray(last?.cards) ? (last!.cards as { type: string; question?: string }[]) : [];
    const question = cards.find((c) => c.type === "question")?.question;
    const botAt = lastBotAt.get(b.id);
    return {
      id: b.id,
      name: b.name,
      color: b.color,
      status: b.status,
      preview: question ?? (last?.content ?? "").replace(/[*_`#>]/g, "").slice(0, 120),
      unread: Boolean(botAt && botAt > b.lastReadAt),
    };
  });

  return (
    <>
      <TimezoneSync />
      <BotsShell bots={bots} user={profile}>
        {children}
      </BotsShell>
    </>
  );
}
