import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId, getOrgRole } from "@/lib/org";
import { SEAT_LIMIT, type PlanId } from "@/lib/plans";
import { CopyField } from "@/components/CopyField";
import { createInvite, revokeInvite, removeMember } from "../team-actions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };

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
  const plan = (org?.plan ?? "trial") as PlanId;
  const seatLimit = SEAT_LIMIT[plan] ?? 1;

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
        .select("id, email, role, token")
        .eq("org_id", orgId)
        .is("accepted_at", null)
        .order("created_at", { ascending: true })
    : { data: [] };

  const seatsUsed = members.length + (invites?.length ?? 0);
  const atLimit = seatsUsed >= seatLimit;

  const card = "overflow-hidden rounded-2xl border border-line bg-surface shadow-sm";

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">Team</h1>
          <p className="mt-1 text-sm text-muted">People with access to this workspace.</p>
        </div>
        <span className="ml-auto rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted">
          {seatsUsed} of {seatLimit} seat{seatLimit === 1 ? "" : "s"}
        </span>
      </div>

      {/* invite */}
      {canManage ? (
        <div className={`mt-6 ${card}`}>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-sm font-semibold">Invite a teammate</h2>
          </div>
          <div className="p-4">
            {atLimit ? (
              <p className="text-sm text-muted">
                You’ve used all {seatLimit} seat{seatLimit === 1 ? "" : "s"} on the {ROLE_LABEL[plan] ?? plan}{" "}
                plan.{" "}
                <a href="/billing" className="font-medium text-blue-ink underline">
                  Upgrade
                </a>{" "}
                to add more.
              </p>
            ) : (
              <form action={createInvite} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-muted">Email</span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-muted">Role</span>
                  <select
                    name="role"
                    defaultValue="member"
                    className="rounded-xl border border-line bg-ground px-3 py-2.5 text-sm outline-none focus-visible:border-blue"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm hover:shadow-md"
                >
                  Create invite
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {/* members */}
      <div className={`mt-5 ${card}`}>
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-display text-sm font-semibold">Members</h2>
        </div>
        {members.map((m, i) => (
          <div
            key={m.user_id}
            className={`flex items-center gap-3 px-4 py-3.5 ${i < members.length - 1 ? "border-b border-line" : ""}`}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {m.email}
                {m.user_id === user?.id ? <span className="ml-1.5 text-xs text-muted">(you)</span> : null}
              </div>
            </div>
            <span className="ml-auto rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted">
              {ROLE_LABEL[m.role] ?? m.role}
            </span>
            {canManage && m.user_id !== user?.id ? (
              <form action={removeMember}>
                <input type="hidden" name="user_id" value={m.user_id} />
                <button
                  type="submit"
                  className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-terra hover:text-terra"
                >
                  Remove
                </button>
              </form>
            ) : null}
          </div>
        ))}
      </div>

      {/* pending invites */}
      {canManage && invites && invites.length > 0 ? (
        <div className={`mt-5 ${card}`}>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-sm font-semibold">Pending invites</h2>
          </div>
          {invites.map((inv, i) => (
            <div
              key={inv.id}
              className={`flex flex-col gap-2 px-4 py-3.5 ${i < invites.length - 1 ? "border-b border-line" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 truncate text-sm">{inv.email}</div>
                <span className="ml-auto rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted">
                  {ROLE_LABEL[inv.role] ?? inv.role}
                </span>
                <form action={revokeInvite}>
                  <input type="hidden" name="invite_id" value={inv.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-terra hover:text-terra"
                  >
                    Revoke
                  </button>
                </form>
              </div>
              <CopyField value={`${APP_URL}/invite/${inv.token}`} />
            </div>
          ))}
          <p className="px-4 pb-3 text-xs text-muted">
            Share the link with each teammate — they accept by signing in with the invited email.
          </p>
        </div>
      ) : null}
    </div>
  );
}
