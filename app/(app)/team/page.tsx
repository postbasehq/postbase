import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId, getOrgRole } from "@/lib/org";
import { PLANS, SEAT_LIMIT, type PlanId } from "@/lib/plans";
import { seatUsage } from "@/lib/billing-guard";
import { TeamView } from "@/components/team/TeamView";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function TeamPage() {
  const orgId = await getCurrentOrgId();
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const role = orgId ? await getOrgRole(orgId) : null;
  const canManage = role === "owner" || role === "admin";

  const db = createAdminClient();
  const { data: org } = orgId
    ? await db.from("orgs").select("plan, name").eq("id", orgId).single()
    : { data: null };
  // Seats are shared across every workspace the plan covers.
  const seats = orgId ? await seatUsage(orgId) : null;
  const plan = (seats?.group.plan ?? org?.plan ?? "trial") as PlanId;
  const seatLimit = SEAT_LIMIT[plan] ?? 1;
  const planName = plan === "trial" ? "trial" : PLANS[plan].name;
  const shared = (seats?.group.orgIds.length ?? 1) > 1;

  const { data: memberRows } = orgId
    ? await db.from("org_members").select("user_id, role, created_at").eq("org_id", orgId)
    : { data: [] };
  const members = await Promise.all(
    (memberRows ?? []).map(async (m) => {
      const { data } = await db.auth.admin.getUserById(m.user_id);
      return { user_id: m.user_id, role: m.role as string, email: data.user?.email ?? "—" };
    }),
  );

  const { data: invites } = orgId
    ? await db
        .from("org_invites")
        .select("id, email, role, token, expires_at")
        .eq("org_id", orgId)
        .is("accepted_at", null)
        .order("created_at", { ascending: true })
    : { data: [] };

  const now = Date.now();
  const seatsUsed = seats?.used ?? members.length + (invites ?? []).filter((i) => Date.parse(i.expires_at) > now).length;

  return (
    <TeamView
      canManage={canManage}
      currentUserId={user?.id ?? null}
      plan={plan}
      planName={planName}
      shared={shared}
      seatLimit={seatLimit}
      seatsUsed={seatsUsed}
      members={members}
      invites={invites ?? []}
      appUrl={APP_URL}
    />
  );
}
