import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId, getOrgRole } from "@/lib/org";
import { SEAT_LIMIT, type PlanId } from "@/lib/plans";
import { LogoMark } from "@/components/marketing/Decor";
import { workspaceInitial, workspaceTile } from "@/lib/workspace-tile";
import { WorkspaceNameForm } from "@/components/settings/WorkspaceNameForm";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { listConnectedApps } from "@/lib/oauth";
import { BillingStatus, ManageButton } from "@/components/BillingStatus";
import { loadBillingStatus } from "@/lib/billing-status";

const YOU_ARE: Record<string, string> = { owner: "You own it", admin: "You're an admin", member: "You're a member" };
const PROVIDER: Record<string, string> = { google: "Google", github: "GitHub", email: "an email link" };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getCurrentOrgId();
  const role = orgId ? await getOrgRole(orgId) : null;
  const canManage = role === "owner" || role === "admin";

  const db = createAdminClient();
  const billing = await loadBillingStatus(orgId);
  const [{ data: org }, members, invites, { data: keys }, apps] = orgId
    ? await Promise.all([
        db.from("orgs").select("name, created_at, plan").eq("id", orgId).single(),
        db.from("org_members").select("user_id", { count: "exact", head: true }).eq("org_id", orgId),
        db.from("org_invites").select("id", { count: "exact", head: true }).eq("org_id", orgId).is("accepted_at", null),
        // Never select hashed_key.
        db.from("api_keys").select("id, label, key_hint, last_used_at").eq("org_id", orgId).order("created_at", { ascending: false }),
        user ? listConnectedApps(user.id) : Promise.resolve([]),
      ])
    : [{ data: null }, null, null, { data: [] }, []];

  const name = org?.name ?? "My workspace";
  // Seats and plan are shared across every workspace the plan covers.
  const plan = billing.plan;
  const seatsUsed = billing.card.meters.find((m) => m.label === "People")?.used ?? (members?.count ?? 0) + (invites?.count ?? 0);
  const seatLimit = SEAT_LIMIT[plan] ?? 1;
  const tile = workspaceTile(orgId);

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const displayName = (meta.full_name as string) || (meta.name as string) || "";
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || "";
  const providers = ((user?.app_metadata?.providers as string[] | undefined) ?? [user?.app_metadata?.provider as string]).filter(Boolean);
  const signIn = providers.map((p) => PROVIDER[p] ?? p).join(" or ");
  // What can act on this workspace from outside the app.
  const orgApps = (apps as Awaited<ReturnType<typeof listConnectedApps>>).filter((a) => a.orgId === orgId);
  const appNames = [...new Set(orgApps.map((a) => a.appName))];
  const keyList = keys ?? [];
  const lastKeyUse = keyList.map((k) => k.last_used_at).filter(Boolean).sort().at(-1) as string | undefined;
  const tz = decodeURIComponent((await cookies()).get("pb_tz")?.value ?? "") || "UTC";

  return (
    <div className="pb-16">
      <div className="flex flex-col gap-6">
        {/* Workspace */}
        <Card
          panel={
            <div className="flex items-center gap-4">
              <span
                className="grid size-14 shrink-0 place-items-center rounded-2xl font-display text-[24px] font-semibold"
                style={{ background: tile.bg, color: tile.fg }}
                aria-hidden
              >
                {workspaceInitial(name)}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-muted">Workspace</div>
                <div className="truncate font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">{name}</div>
                <div className="mt-1 text-[13px] text-muted">
                  {[role ? YOU_ARE[role] ?? null : null, org?.created_at ? `Created ${fmtDate(org.created_at)}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            </div>
          }
        >
          {canManage ? (
            <WorkspaceNameForm name={name} />
          ) : (
            <p className="text-[13px] text-muted">Only owners and admins can rename the workspace.</p>
          )}
          <div className="mt-6 border-t border-line">
            <Row
              label="People"
              value={`${seatsUsed} of ${seatLimit} ${seatLimit === 1 ? "seat" : "seats"}`}
              note={billing.billedThrough ? "Shared across the plan's workspaces" : undefined}
              href="/team"
              cta="Manage team"
              last={!billing.billedThrough}
            />
            {billing.billedThrough ? (
              <Row label="Plan" value={`Included in ${billing.billedThrough.name}'s plan`} href="/billing" cta="Details" last />
            ) : null}
          </div>
        </Card>

        {/* Plan and usage, the same card as the Billing page */}
        <BillingStatus
          {...billing.card}
          action={
            <div className="flex flex-wrap items-center gap-3">
              {billing.canManage ? <ManageButton /> : null}
              <Link
                href="/billing"
                className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
              >
                {billing.active || billing.comped ? "Plans and billing" : "Choose a plan"}
              </Link>
            </div>
          }
        />

        {/* Account */}
        <Card
          panel={
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="size-14 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ink font-display text-[22px] font-semibold text-ground" aria-hidden>
                  {(displayName || user?.email || "?")[0].toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-muted">Your account</div>
                <div className="truncate font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  {displayName || user?.email}
                </div>
                {displayName ? <div className="mt-1 truncate text-[13px] text-muted">{user?.email}</div> : null}
              </div>
            </div>
          }
        >
          <div className="-mt-1">
            <Row label="Sign-in" value={signIn ? `You sign in with ${signIn}` : "—"} />
            <Row label="Timezone" value={`${tz.replace(/_/g, " ")}, from this device`} note="Post times are shown in this timezone." />
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-ink">Sign out</div>
                <div className="text-[13px] text-muted">Scheduled posts still go out while you&apos;re signed out.</div>
              </div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-line bg-surface px-5 py-2.5 font-display text-sm font-semibold text-[#d14a3e] shadow-sm transition-colors hover:border-[#d14a3e]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </Card>

        {/* Developers */}
        <Card
          panel={
            <div>
              <div className="text-[13px] font-medium text-muted">Developers</div>
              <div className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">API keys and AI tools</div>
              <div className="mt-1 text-[13px] text-muted">Everything that can post to this workspace from outside the app.</div>
            </div>
          }
        >
          <div className="-mt-1">
            <Row
              label="API keys"
              value={keyList.length === 0 ? "No keys yet" : `${keyList.length} ${keyList.length === 1 ? "key" : "keys"}`}
              note={
                keyList.length === 0
                  ? "For the REST API and the npm MCP package."
                  : `${keyList
                      .slice(0, 3)
                      .map((k) => `${k.label || "Untitled"}${k.key_hint ? ` (${k.key_hint})` : ""}`)
                      .join(", ")}${keyList.length > 3 ? ` and ${keyList.length - 3} more` : ""}${
                      lastKeyUse ? ` · last used ${fmtDate(lastKeyUse)}` : " · never used"
                    }`
              }
              href="/api-keys"
              cta={keyList.length === 0 ? "Create a key" : "Manage keys"}
            />
            <Row
              label="AI tools"
              value={appNames.length === 0 ? "None connected" : appNames.join(", ")}
              note={
                appNames.length === 0
                  ? "Connect Claude, ChatGPT, Cursor and others by signing in. No key needed."
                  : "Signed in to this workspace. Revoke any of them on the Developers page."
              }
              href="/api-keys"
              cta={appNames.length === 0 ? "Connect a tool" : "Manage"}
              last
            />
          </div>
        </Card>

        {/* Appearance */}
        <Card
          panel={
            <div>
              <div className="text-[13px] font-medium text-muted">Appearance</div>
              <div className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">Theme</div>
              <div className="mt-1 text-[13px] text-muted">Saved on this device. The site and the app follow it.</div>
            </div>
          }
        >
          <ThemePicker />
        </Card>
      </div>
    </div>
  );
}

/** Two zones, like the plan cards: an inset panel with the faint Postbase mark, then the content. */
function Card({ panel, children }: { panel: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-line bg-surface p-2 shadow-sm">
      <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface-2 p-5 md:p-6">
        <LogoMark
          color="currentColor"
          className="pointer-events-none absolute -z-10 right-6 top-0 w-[160px] text-ink opacity-[0.06]"
        />
        {panel}
      </div>
      <div className="px-4 pb-4 pt-5 md:px-5">{children}</div>
    </section>
  );
}

function Row({ label, value, note, href, cta, last }: { label: string; value: string; note?: string; href?: string; cta?: string; last?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-1 py-3.5 ${last ? "" : "border-b border-line"}`}>
      <div className="w-24 shrink-0 text-[13px] text-muted">{label}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium text-ink">{value}</div>
        {note ? <div className="text-[12px] text-muted">{note}</div> : null}
      </div>
      {href && cta ? (
        <Link href={href} className="text-[13px] font-semibold text-blue-ink hover:underline">
          {cta} →
        </Link>
      ) : null}
    </div>
  );
}
