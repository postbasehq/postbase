import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppNav } from "@/components/AppNav";
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
  let email: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? undefined;
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
    <div className="flex h-dvh overflow-hidden">
      <TimezoneSync />
      {onboarding.show ? <OnboardingWizard connected={onboarding.connected} /> : null}
      {/* sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface md:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Logo href="/calendar" />
        </div>
        <OrgSwitcher orgs={orgs} activeId={activeId} action={setActiveOrg} />
        <AppNav />
        <div className="border-t border-line p-3 text-xs text-muted">
          <div className="truncate px-3 py-1">{email}</div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
