import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppNav } from "@/components/AppNav";
import { UserMenu } from "@/components/UserMenu";
import { SidebarSearch } from "@/components/SidebarSearch";
import { HeaderTitle } from "@/components/HeaderTitle";
import { AgentSparkIcon } from "@/components/AgentSparkIcon";
import { SidebarSwitcher } from "@/components/SidebarSwitcher";
import { MobileNav } from "@/components/MobileNav";
import { AgentProposalDock } from "@/components/AgentProposalDock";
import { NotificationBell, type ChannelIssue, type Notice } from "@/components/NotificationBell";
import { channelHealth, RECONNECT_WARN_MS } from "@/lib/channel-health";
import { OrgSwitcher, type WorkspaceAllowance } from "@/components/OrgSwitcher";
import { TimezoneSync } from "@/components/TimezoneSync";
import { PlanGate } from "@/components/PlanGate";
import { billingEnforced, billingGroup, orgHasAccess } from "@/lib/billing-guard";
import { PLANS, WORKSPACE_LIMIT, nextWorkspacePlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { needsTwoFactor, VERIFY_PATH } from "@/lib/mfa";
import { getUserOrgs, getCurrentOrgId } from "@/lib/org";
import { setActiveOrg } from "./team-actions";

// The signed-in app is never indexed (robots.txt also disallows these paths).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = "";
  let displayName = "";
  let avatarUrl: string | undefined;
  let stepUp = false;
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
    // Middleware already holds unverified 2FA sessions at the code prompt; this
    // is the backstop.
    stepUp = await needsTwoFactor(supabase, user);
  } catch {
    redirect("/login");
  }
  if (stepUp) redirect(VERIFY_PATH);

  const [orgs, activeId] = await Promise.all([getUserOrgs(), getCurrentOrgId()]);

  // Plan access + notification bell data (both scoped by RLS).
  let notices: Notice[] = [];
  let channelIssues: ChannelIssue[] = [];
  let locked = false;
  let workspaces: WorkspaceAllowance | null = null;
  // Set when this workspace's plan belongs to another workspace, for the no-plan screen.
  let linkedTo: { name: string; canManage: boolean } | null = null;
  if (activeId) {
    const supabase = await createClient();
    const [group, { data: failed }, { data: chans }] = await Promise.all([
      // The plan may belong to the workspace this one is billed through.
      billingGroup(activeId),
      // Terminally-failed deliveries (no retry pending) become notifications.
      supabase
        .from("post_targets")
        .select("id, error, posts!inner(id, body, org_id), channels(platform)")
        .eq("posts.org_id", activeId)
        .eq("status", "failed")
        .is("next_attempt_at", null)
        .limit(20),
      // Channels that need reconnecting (or will soon) come first in the bell.
      supabase
        .from("channels")
        .select("id, platform, handle, display_name, status, status_error, reconnect_by")
        .eq("org_id", activeId)
        .or(`status.eq.reconnect,reconnect_by.lt.${new Date(Date.now() + RECONNECT_WARN_MS).toISOString()}`),
    ]);
    channelIssues = (chans ?? [])
      .map((c) => ({ c, health: channelHealth(c) }))
      .filter(({ health }) => health !== "ok")
      .map(({ c, health }) => ({
        id: c.id,
        platform: c.platform,
        name: c.display_name || c.handle || null,
        health: health as "reconnect" | "expiring",
        reconnectBy: c.reconnect_by ?? null,
      }));
    locked = billingEnforced() && !orgHasAccess(group);
    // What the switcher needs to offer "Create workspace", or an upgrade instead.
    const rootRole = orgs.find((o) => o.id === group.rootId)?.role ?? null;
    const limit = WORKSPACE_LIMIT[group.plan] ?? 1;
    const next = nextWorkspacePlan(group.plan);
    workspaces = {
      used: group.orgIds.length,
      limit,
      planName: group.plan === "trial" ? null : PLANS[group.plan].name,
      nextPlan: next ? { name: PLANS[next].name, limit: WORKSPACE_LIMIT[next] } : null,
      canManage: rootRole === "owner" || rootRole === "admin",
      billingName: group.rootName,
      active: !locked,
    };
    if (group.linked) linkedTo = { name: group.rootName, canManage: workspaces.canManage };
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
    <div className="flex h-dvh flex-col overflow-hidden">
      <div
        className="flex min-h-0 flex-1 overflow-hidden"
        style={{
          background:
            "radial-gradient(1000px 520px at 12% -8%, color-mix(in oklab, var(--blue-soft) 65%, transparent), transparent 70%), radial-gradient(900px 600px at 100% 110%, color-mix(in oklab, var(--blue-soft) 40%, transparent), transparent 65%), var(--ground)",
        }}
      >
        <TimezoneSync />
        {/* sidebar — transparent, sits on the backdrop (a layer behind the panel) */}
        <aside className="hidden w-60 shrink-0 flex-col md:flex">
          <div className="flex h-16 shrink-0 items-center px-5">
            <Logo href="/calendar" />
          </div>
          <SidebarSwitcher>
            <SidebarSearch />
            <OrgSwitcher orgs={orgs} activeId={activeId} action={setActiveOrg} workspaces={workspaces} />
            <AppNav />
          </SidebarSwitcher>
          <UserMenu name={displayName} email={email} avatarUrl={avatarUrl} />
        </aside>

        {/* floating content panel — inset from the edges, elevated over the backdrop */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2 md:py-3 md:pl-0 md:pr-3">
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_50px_-20px_rgba(16,24,40,0.35)]">
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 px-3 md:gap-3 md:px-6">
                {/* Phones: the sidebar is hidden, so it opens as a drawer from here. */}
                <MobileNav
                  header={<Logo href="/calendar" />}
                  footer={
                    <div className="flex items-end gap-1 pr-3">
                      <div className="min-w-0 flex-1">
                        <UserMenu name={displayName} email={email} avatarUrl={avatarUrl} />
                      </div>
                      <div className="pb-4">
                        <ThemeToggle />
                      </div>
                    </div>
                  }
                >
                  <SidebarSwitcher>
                    <SidebarSearch />
                    <OrgSwitcher orgs={orgs} activeId={activeId} action={setActiveOrg} workspaces={workspaces} />
                    <AppNav />
                  </SidebarSwitcher>
                </MobileNav>
                <div className="min-w-0">
                  <HeaderTitle />
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-3">
                  <Link
                    href="/agent"
                    aria-label="Open the AI agent"
                    title="AI agent"
                    className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
                  >
                    <AgentSparkIcon size={18} />
                  </Link>
                  <NotificationBell items={notices} channelIssues={channelIssues} />
                  {/* On phones the theme toggle lives in the menu drawer. */}
                  <div className="hidden md:block">
                    <ThemeToggle />
                  </div>
                  <Link
                    href="/composer"
                    className="ml-1 whitespace-nowrap rounded-full bg-blue px-3.5 py-2 font-display text-sm font-semibold text-on-blue shadow-sm md:ml-0 md:px-4"
                  >
                    New post
                  </Link>
                </div>
              </header>
              <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
                <div className="mx-auto h-full w-full max-w-[1200px]">
                  <PlanGate locked={locked} linkedTo={linkedTo}>{children}</PlanGate>
                </div>
              </main>
            </div>

            {/* Agent proposed-post panel — splits the card on /agent when open */}
            <AgentProposalDock />
          </div>
        </div>
      </div>
    </div>
  );
}
