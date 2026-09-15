import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppNav } from "@/components/AppNav";
import { UserMenu } from "@/components/UserMenu";
import { SidebarSearch } from "@/components/SidebarSearch";
import { HeaderTitle } from "@/components/HeaderTitle";
import { NotificationBell, type Notice } from "@/components/NotificationBell";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { TimezoneSync } from "@/components/TimezoneSync";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { createClient } from "@/lib/supabase/server";
import { getUserOrgs, getCurrentOrgId } from "@/lib/org";
import { setActiveOrg } from "./team-actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = "";
  let displayName = "";
  let avatarUrl: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? "";
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    displayName =
      (meta.full_name as string) || (meta.name as string) || (meta.user_name as string) || "";
    avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || undefined;
  } catch {
    redirect("/login");
  }

  const [orgs, activeId] = await Promise.all([getUserOrgs(), getCurrentOrgId()]);

  // First-run onboarding + notification bell data (both scoped by RLS).
  let onboarding: { show: boolean; connected: string[] } = { show: false, connected: [] };
  let notices: Notice[] = [];
  if (activeId) {
    const supabase = await createClient();
    const [{ data: org }, { data: channels }, { data: failed }] = await Promise.all([
      supabase.from("orgs").select("onboarded_at").eq("id", activeId).maybeSingle(),
      supabase.from("channels").select("platform"),
      // Terminally-failed deliveries (no retry pending) become notifications.
      supabase
        .from("post_targets")
        .select("id, error, posts(id, body), channels(platform)")
        .eq("status", "failed")
        .is("next_attempt_at", null)
        .limit(20),
    ]);
    if (org && org.onboarded_at === null) {
      onboarding = {
        show: true,
        connected: Array.from(new Set((channels ?? []).map((c) => c.platform))),
      };
    }
    notices = ((failed ?? []) as unknown as {
      id: string;
      error: string | null;
      posts: { id: string; body: string } | null;
      channels: { platform: string } | null;
    }[])
      .filter((t) => t.posts)
      .map((t) => ({
        id: t.id,
        postId: t.posts!.id,
        platform: t.channels?.platform ?? "—",
        body: t.posts!.body,
        error: t.error,
      }));
  }

  return (
    <div
      className="flex h-dvh overflow-hidden"
      style={{
        background:
          "radial-gradient(1000px 520px at 12% -8%, color-mix(in oklab, var(--blue-soft) 65%, transparent), transparent 70%), radial-gradient(900px 600px at 100% 110%, color-mix(in oklab, var(--blue-soft) 40%, transparent), transparent 65%), var(--ground)",
      }}
    >
      <TimezoneSync />
      {onboarding.show ? <OnboardingWizard connected={onboarding.connected} /> : null}
      {/* sidebar — transparent, sits on the backdrop (a layer behind the panel) */}
      <aside className="hidden w-60 shrink-0 flex-col md:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Logo href="/calendar" />
        </div>
        <SidebarSearch />
        <OrgSwitcher orgs={orgs} activeId={activeId} action={setActiveOrg} />
        <AppNav />
        <UserMenu name={displayName} email={email} avatarUrl={avatarUrl} />
      </aside>

      {/* floating content panel — inset from the edges, elevated over the backdrop */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col py-3 pl-0 pr-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_50px_-20px_rgba(16,24,40,0.35)]">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-6">
            <HeaderTitle />
            <div className="ml-auto flex items-center gap-3">
              <NotificationBell items={notices} />
              <ThemeToggle />
              <Link
                href="/composer"
                className="rounded-full bg-blue px-4 py-2 font-display text-sm font-semibold text-on-blue shadow-sm"
              >
                New post
              </Link>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mx-auto h-full w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
