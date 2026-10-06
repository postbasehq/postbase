import { CopyField } from "@/components/CopyField";
import { SubmitButton } from "@/components/SubmitButton";
import { LogoMark } from "@/components/marketing/Decor";
import { workspaceTile } from "@/lib/workspace-tile";
import { createInvite, resendInvite, revokeInvite, removeMember } from "@/app/(app)/team-actions";

/*
 * The Team page: seats and the invite form in one two-zone card (like
 * Settings), then members and pending invites as lists. Data comes from
 * app/(app)/team/page.tsx.
 */

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };

// Solid role labels: owner blue, admin amber, member outlined.
const ROLE_STYLE: Record<string, string> = {
  owner: "bg-[#2b59d9] text-white",
  admin: "bg-[#e3a72c] text-[#14161a]",
  member: "border border-line text-ink",
};

const ROLES = [
  { value: "member", label: "Member", body: "Writes, schedules and publishes posts." },
  { value: "admin", label: "Admin", body: "Also invites people, manages billing and disconnects channels." },
];

type Member = { user_id: string; role: string; email: string };
type Invite = { id: string; email: string; role: string; token: string; expires_at: string };

export function TeamView({
  canManage,
  currentUserId,
  plan,
  planName,
  shared,
  seatLimit,
  seatsUsed,
  members,
  invites,
  appUrl,
}: {
  canManage: boolean;
  currentUserId: string | null;
  plan: string;
  planName: string;
  shared: boolean;
  seatLimit: number;
  seatsUsed: number;
  members: Member[];
  invites: Invite[];
  appUrl: string;
}) {
  const now = Date.now();
  const atLimit = seatsUsed >= seatLimit;
  const liveInvites = (invites ?? []).filter((i) => Date.parse(i.expires_at) > now).length;
  // Seats are shared by the plan's workspaces: invites here, everyone else counts as in use.
  const inUse = Math.max(0, seatsUsed - liveInvites);
  const free = Math.max(0, seatLimit - seatsUsed);
  const daysLeft = (iso: string) => Math.max(1, Math.ceil((Date.parse(iso) - now) / 86_400_000));

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Seats, then the invite form: two zones, like Settings */}
      <section className="rounded-[22px] border border-line bg-surface p-2 shadow-sm">
        <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface-2 p-5 md:p-6">
          <LogoMark color="currentColor" edge="top" className="pointer-events-none absolute right-6 top-0 -z-10 w-[160px] text-ink opacity-[0.06]" />
          <div className="text-[13px] font-medium text-muted">Seats</div>
          <div className="mt-0.5 font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            {seatsUsed} of {seatLimit}
          </div>
          <div className="mt-1 text-[13px] text-muted">
            {plan === "trial" ? "Trial" : `${planName} plan`}
            {shared ? " · shared across your workspaces" : ""}
          </div>
          {/* One tile per seat */}
          <div className="mt-5 flex flex-wrap gap-1.5" aria-hidden>
            {Array.from({ length: Math.min(seatLimit, 60) }, (_, n) => (
              <span
                key={n}
                className={`size-5 rounded-[6px] ${
                  n < inUse ? "bg-[#2b59d9]" : n < inUse + liveInvites ? "bg-[#e3a72c]" : "border-2 border-line"
                }`}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-[#2b59d9]" /> {inUse} in use
            </span>
            {liveInvites ? (
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-[#e3a72c]" /> {liveInvites} invited
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] border-2 border-line" /> {free} free
            </span>
          </div>
        </div>

        <div className="px-4 pb-4 pt-5 md:px-5">
          {!canManage ? (
            <p className="text-[13px] text-muted">Only owners and admins can invite people.</p>
          ) : atLimit ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-medium text-ink">Every seat is taken</div>
                <div className="text-[13px] text-muted">
                  The {planName} plan includes {seatLimit} {seatLimit === 1 ? "seat" : "seats"}. A bigger plan adds more.
                </div>
              </div>
              <a
                href="/billing"
                className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
              >
                See plans
              </a>
            </div>
          ) : (
            <form action={createInvite} className="flex flex-col gap-4">
              <div className="text-[14px] font-medium text-ink">Invite a teammate</div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] text-muted">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="teammate@company.com"
                  className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-[#2b59d9]"
                />
              </label>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-[13px] text-muted">Role</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ROLES.map((r) => (
                    <label
                      key={r.value}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-line px-3.5 py-3 transition-colors hover:border-ink has-[:checked]:border-[#2b59d9]"
                    >
                      <input type="radio" name="role" value={r.value} defaultChecked={r.value === "member"} className="mt-1 accent-[#2b59d9]" />
                      <span>
                        <span className="block text-[14px] font-medium text-ink">{r.label}</span>
                        <span className="block text-[12px] leading-snug text-muted">{r.body}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[12px] text-muted">We email the invite. The link works for 7 days.</span>
                <SubmitButton
                  pendingLabel="Sending…"
                  className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-60"
                >
                  Send invite
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Members */}
      <section>
        <h2 className="mb-3 flex items-baseline gap-2 font-display text-[18px] font-semibold text-ink">
          Members <span className="text-[13px] font-medium text-muted">{members.length}</span>
        </h2>
        <ul className="rounded-[22px] border border-line bg-surface p-2 shadow-sm">
          {members.map((m) => {
            const t = workspaceTile(m.user_id);
            const you = m.user_id === currentUserId;
            return (
              <li key={m.user_id} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-surface-2">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-[10px] font-display text-[15px] font-semibold"
                  style={{ background: t.bg, color: t.fg }}
                  aria-hidden
                >
                  {m.email[0]?.toUpperCase() ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-ink">{m.email}</div>
                  {you ? <div className="text-[12px] text-muted">You</div> : null}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${ROLE_STYLE[m.role] ?? ROLE_STYLE.member}`}>
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
                {canManage && !you ? (
                  <form action={removeMember}>
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <SubmitButton className="rounded-full px-2.5 py-1 text-[13px] font-semibold text-muted transition-colors hover:text-[#d14a3e] disabled:opacity-50">
                      Remove
                    </SubmitButton>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Pending invites */}
      {canManage && invites && invites.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-baseline gap-2 font-display text-[18px] font-semibold text-ink">
            Invited <span className="text-[13px] font-medium text-muted">{invites.length}</span>
          </h2>
          <ul className="rounded-[22px] border border-line bg-surface p-2 shadow-sm">
            {invites.map((inv) => {
              const expired = Date.parse(inv.expires_at) <= now;
              return (
                <li key={inv.id} className="flex flex-col gap-2.5 rounded-xl px-3 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border-2 border-dashed border-line font-display text-[15px] font-semibold text-muted" aria-hidden>
                      {inv.email[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-ink">{inv.email}</div>
                      <div className={`text-[12px] ${expired ? "font-medium text-[#d14a3e]" : "text-muted"}`}>
                        {expired ? "Expired" : `Expires in ${daysLeft(inv.expires_at)} ${daysLeft(inv.expires_at) === 1 ? "day" : "days"}`}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${ROLE_STYLE[inv.role] ?? ROLE_STYLE.member}`}>
                      {ROLE_LABEL[inv.role] ?? inv.role}
                    </span>
                    <form action={resendInvite}>
                      <input type="hidden" name="invite_id" value={inv.id} />
                      <SubmitButton
                        pendingLabel="Sending…"
                        className="rounded-full px-2.5 py-1 text-[13px] font-semibold text-blue-ink hover:underline disabled:opacity-50"
                      >
                        Resend
                      </SubmitButton>
                    </form>
                    <form action={revokeInvite}>
                      <input type="hidden" name="invite_id" value={inv.id} />
                      <SubmitButton className="rounded-full px-2.5 py-1 text-[13px] font-semibold text-muted transition-colors hover:text-[#d14a3e] disabled:opacity-50">
                        Revoke
                      </SubmitButton>
                    </form>
                  </div>
                  {!expired ? (
                    <div className="pl-12">
                      <CopyField value={`${appUrl}/invite/${inv.token}`} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 px-1 text-[12px] text-muted">
            They accept by signing in with the invited email. Resend sends a fresh link that works for another 7 days.
          </p>
        </section>
      ) : null}
    </div>
  );
}
