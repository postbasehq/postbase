import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/Logo";
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

  const shell = (body: React.ReactNode) => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <Logo />
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-sm">{body}</div>
    </div>
  );

  if (!invite || invite.accepted_at) {
    return shell(
      <>
        <h1 className="font-display text-lg font-semibold">Invite not available</h1>
        <p className="mt-1.5 text-sm text-muted">This invite is invalid or has already been used.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-ink underline">
          Go to Postbase
        </Link>
      </>,
    );
  }

  if (!user) {
    return shell(
      <>
        <h1 className="font-display text-lg font-semibold">Join {orgName} on Postbase</h1>
        <p className="mt-1.5 text-sm text-muted">
          Sign in with <span className="font-medium text-ink">{invite.email}</span> to accept, then
          reopen this link.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm"
        >
          Sign in
        </Link>
      </>,
    );
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return shell(
      <>
        <h1 className="font-display text-lg font-semibold">Wrong account</h1>
        <p className="mt-1.5 text-sm text-muted">
          This invite is for <span className="font-medium text-ink">{invite.email}</span>, but you’re
          signed in as {user.email}.
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-blue-ink hover:bg-surface-2"
          >
            Sign out
          </button>
        </form>
      </>,
    );
  }

  return shell(
    <>
      <h1 className="font-display text-lg font-semibold">Join {orgName}</h1>
      <p className="mt-1.5 text-sm text-muted">
        You’ve been invited as a <span className="font-medium text-ink">{invite.role}</span>. Accept to
        start publishing with the team.
      </p>
      <form action={acceptInvite} className="mt-4">
        <input type="hidden" name="token" value={token} />
        <SubmitButton
          pendingLabel="Accepting…"
          className="rounded-full bg-blue px-6 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm hover:shadow-md disabled:opacity-60"
        >
          Accept invite
        </SubmitButton>
      </form>
    </>,
  );
}
