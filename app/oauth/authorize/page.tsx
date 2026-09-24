import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ClientLogo } from "@/components/ClientLogo";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId, getUserOrgs } from "@/lib/org";
import { getClient } from "@/lib/oauth";
import { approveAuthorization, denyAuthorization } from "./actions";

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const SHELL = {
  tone: "red" as const,
  scene: "developers" as const,
  title: "Give your agent a publish button.",
  sub: "Connected tools can draft and schedule posts in your workspace. Everything they do shows up in your calendar.",
};

function ErrorCard({ title, detail }: { title: string; detail: string }) {
  return (
    <AuthShell {...SHELL}>
      <div className="swap-in">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[#d14a3e] text-white">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </span>
        <h1 className="mt-6 font-display text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink">{title}</h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{detail}</p>
      </div>
    </AuthShell>
  );
}

/** Match a client's registered name to one of our bundled tool logos. */
function logoFor(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("claude code")) return "claude-code";
  if (n.includes("claude")) return "claude";
  if (n.includes("cursor")) return "cursor";
  if (n.includes("vs code") || n.includes("visual studio") || n.includes("copilot")) return "vscode";
  if (n.includes("windsurf")) return "windsurf";
  if (n.includes("gemini")) return "gemini";
  return null;
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

  const logo = logoFor(appName);
  return (
    <AuthShell {...SHELL}>
      <div className="swap-in">
        {/* app ⇄ Postbase */}
        <div className="flex items-center gap-3">
          {logo ? (
            <span className="rounded-2xl shadow-sm">
              <ClientLogo id={logo} size={56} />
            </span>
          ) : (
            <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 font-display text-[22px] font-semibold text-ink ring-1 ring-line">
              {appName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="flex items-center gap-1 text-muted" aria-hidden>
            <span className="size-1 rounded-full bg-line" />
            <span className="size-1 rounded-full bg-line" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16 3 12l4-4M3 12h18M17 8l4 4-4 4" />
            </svg>
            <span className="size-1 rounded-full bg-line" />
            <span className="size-1 rounded-full bg-line" />
          </span>
          <span className="size-14 overflow-hidden rounded-2xl shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/postbase-icon.png" alt="" className="size-full object-cover" />
          </span>
        </div>

        <h1 className="mt-6 font-display text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink">
          {appName} wants to connect to Postbase
        </h1>
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[13px] font-semibold text-surface">
            {(user.email ?? "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13.5px] font-semibold text-ink">{user.email}</div>
            {!multiOrg ? <div className="truncate text-[12px] text-muted">Workspace: {currentOrgName}</div> : null}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[13px] font-semibold text-ink">{appName} will be able to:</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {[
              ["See your connected channels", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
              ["Draft and schedule posts", "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
              ["Review and cancel scheduled posts", "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18"],
            ].map(([t, d]) => (
              <li key={t} className="flex items-center gap-3 text-[14px] text-ink">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-blue-ink">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={d} />
                  </svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          It can&apos;t change billing, team members or your account settings. You can revoke access any time from Developers.
        </p>

        <form className="mt-6">
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
              className="h-12 flex-1 rounded-full border border-line bg-surface text-[15px] font-semibold text-ink shadow-sm transition hover:border-ink/30"
            >
              Deny
            </button>
            <button
              type="submit"
              formAction={approveAuthorization}
              className="h-12 flex-1 rounded-full bg-blue font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
            >
              Authorize
            </button>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
