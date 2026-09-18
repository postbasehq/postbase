import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId, getUserOrgs } from "@/lib/org";
import { getClient } from "@/lib/oauth";
import { approveAuthorization, denyAuthorization } from "./actions";

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function ErrorCard({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-7 text-center shadow-md">
        <h1 className="font-display text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted">{detail}</p>
      </div>
    </main>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const responseType = one(sp.response_type);
  const clientId = one(sp.client_id);
  const redirectUri = one(sp.redirect_uri);
  const codeChallenge = one(sp.code_challenge);
  const codeChallengeMethod = one(sp.code_challenge_method) || "S256";
  const state = one(sp.state);
  const scope = one(sp.scope);
  const resource = one(sp.resource);

  // Validate the request. Don't redirect to an unverified redirect_uri — show an
  // error page instead (prevents open-redirect / phishing via a bad client).
  if (responseType !== "code") {
    return <ErrorCard title="Unsupported request" detail="Only the authorization code flow is supported." />;
  }
  const client = await getClient(clientId);
  if (!client) {
    return <ErrorCard title="Unknown application" detail="This client isn't registered. Try reconnecting from your tool." />;
  }
  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    return <ErrorCard title="Redirect mismatch" detail="The redirect URL isn't registered for this application." />;
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return <ErrorCard title="Security check failed" detail="This application must use PKCE with S256." />;
  }

  // Require a signed-in Postbase user; bounce through login and return here.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const qs = new URLSearchParams(
      Object.entries({
        response_type: responseType,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        state,
        scope,
        resource,
      }).filter(([, v]) => v),
    ).toString();
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${qs}`)}`);
  }

  const [orgId, orgs] = await Promise.all([getCurrentOrgId(), getUserOrgs()]);
  const defaultOrgId = orgId ?? orgs[0]?.id ?? "";
  const currentOrgName =
    orgs.find((o) => o.id === defaultOrgId)?.name ?? orgs[0]?.name ?? "your workspace";
  const multiOrg = orgs.length > 1;

  const appName = client.name?.trim() || "An application";
  const hidden = {
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    state,
    scope,
    resource,
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-[440px] rounded-2xl border border-line bg-surface p-7 shadow-md">
        <div className="flex items-center gap-2.5">
          <Logo />
        </div>

        <h1 className="mt-6 font-display text-xl font-semibold tracking-[-0.01em]">
          {appName} wants to connect to Postbase
        </h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as <b className="text-ink">{user.email}</b>
          {!multiOrg ? (
            <>
              {" "}
              · workspace <b className="text-ink">{currentOrgName}</b>
            </>
          ) : null}
        </p>

        <div className="mt-5 rounded-xl border border-line bg-surface-2/40 p-4">
          <p className="text-[13px] font-semibold text-ink">This will let {appName}:</p>
          <ul className="mt-2.5 flex flex-col gap-2 text-[13px] text-muted">
            {[
              "See your connected channels",
              "Draft and schedule posts",
              "Review and cancel scheduled posts",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-blue" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-xs text-muted">
          It won't be able to change billing, team members, or your account settings. You can revoke
          access anytime from Developers.
        </p>

        <form className="mt-5">
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}

          {multiOrg ? (
            <label className="mb-4 flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted">Authorize for workspace</span>
              <select
                name="org_id"
                defaultValue={defaultOrgId}
                className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="org_id" value={defaultOrgId} />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="submit"
              formAction={denyAuthorization}
              className="flex-1 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              Deny
            </button>
            <button
              type="submit"
              formAction={approveAuthorization}
              className="flex-1 rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
            >
              Authorize
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
