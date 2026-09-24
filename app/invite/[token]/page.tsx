import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthShell } from "@/components/auth/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";
import { acceptInvite } from "@/app/(app)/team-actions";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const db = createAdminClient();
  const { data: invite } = await db
    .from("org_invites")
    .select("id, org_id, email, role, accepted_at, orgs(name)")
    .eq("token", token)
    .maybeSingle();

  const {
    data: { user },
  } = await (await createClient()).auth.getUser();

  const orgName = (invite as { orgs?: { name?: string } } | null)?.orgs?.name ?? "a workspace";

  const shell = (body: React.ReactNode, badge?: React.ReactNode) => (
    <AuthShell
      tone="amber"
      scene="teams"
      title="Post together, from one place."
      sub="A workspace per brand, each with its own channels and people. Everyone sees the same calendar."
    >
      <div className="swap-in">
        {badge ?? (
          <span className="flex size-14 items-center justify-center rounded-2xl bg-[#e3a72c] font-display text-[24px] font-semibold text-[#202124] shadow-[0_18px_40px_-18px_rgba(227,167,44,0.9)]">
            {orgName.charAt(0).toUpperCase()}
          </span>
        )}
        {body}
      </div>
    </AuthShell>
  );
  const h1 = "mt-6 font-display text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink";
  const p = "mt-2.5 text-[15px] leading-relaxed text-muted";
  const primary =
    "mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-blue font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:opacity-60";
  const secondary =
    "mt-7 inline-flex h-12 w-full items-center justify-center rounded-full border border-line bg-surface text-[15px] font-semibold text-ink shadow-sm transition hover:border-ink/30";

  if (!invite || invite.accepted_at) {
    return shell(
      <>
        <h1 className={h1}>This invite isn&apos;t available</h1>
        <p className={p}>It may have been used already or revoked. Ask whoever invited you to send a new link.</p>
        <Link href="/" className={secondary}>
          Go to Postbase
        </Link>
      </>,
      <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted ring-1 ring-line">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 4 8M8 12h3M3 3l18 18" />
        </svg>
      </span>,
    );
  }

  if (!user) {
    return shell(
      <>
        <h1 className={h1}>Join {orgName} on Postbase</h1>
        <p className={p}>
          You&apos;ve been invited as {invite.role === "admin" ? "an" : "a"}{" "}
          <span className="font-semibold text-ink">{invite.role}</span>. Sign in with{" "}
          <span className="font-semibold text-ink">{invite.email}</span> to accept.
        </p>
        <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className={primary}>
          Sign in to accept
        </Link>
      </>,
    );
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return shell(
      <>
        <h1 className={h1}>This invite is for a different account</h1>
        <p className={p}>
          It was sent to <span className="font-semibold text-ink">{invite.email}</span>, but you&apos;re signed in as{" "}
          <span className="font-semibold text-ink">{user.email}</span>. Sign out, then open the link again.
        </p>
        <form action="/auth/signout" method="post">
          <button type="submit" className={secondary}>
            Sign out
          </button>
        </form>
      </>,
    );
  }

  return shell(
    <>
      <h1 className={h1}>Join {orgName}</h1>
      <p className={p}>
        You&apos;ve been invited as {invite.role === "admin" ? "an" : "a"}{" "}
        <span className="font-semibold text-ink">{invite.role}</span>. Accept to start posting with the team.
      </p>
      <form action={acceptInvite}>
        <input type="hidden" name="token" value={token} />
        <SubmitButton pendingLabel="Accepting…" className={primary}>
          Accept invite
        </SubmitButton>
      </form>
      <p className="mt-4 text-center text-[12.5px] text-muted">Signed in as {user.email}</p>
    </>,
  );
}
