"use client";

import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase/client";

const RESEND_SECONDS = 30;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "github" | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // A failed or expired magic link comes back here as ?error=auth.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      setError("That sign-in link has expired or was already used. Enter your email to get a new one.");
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Preserve a safe same-origin ?next=… through the auth round-trip (used by the
  // MCP OAuth consent flow to return the user to /oauth/authorize after sign-in).
  function callbackUrl(): string {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const suffix = next && next.startsWith("/") && !next.startsWith("//")
      ? `?next=${encodeURIComponent(next)}`
      : "";
    return `${window.location.origin}/auth/callback${suffix}`;
  }

  async function oauth(provider: "google" | "github") {
    setError(null);
    setOauthBusy(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl() },
      });
      // On success the browser is redirected to the provider, so we only land
      // here on an error.
      if (error) {
        setError(error.message);
        setOauthBusy(null);
      }
    } catch {
      setError("Auth isn’t configured yet — add your Supabase keys to .env.local.");
      setOauthBusy(null);
    }
  }

  async function sendLink() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error) setError(error.message);
      else {
        setSent(true);
        setCooldown(RESEND_SECONDS);
      }
    } catch {
      setError("Auth isn’t configured yet — add your Supabase keys to .env.local.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendLink();
  }

  const provider =
    "flex h-12 items-center justify-center gap-2.5 rounded-full border border-line bg-surface px-5 text-[15px] font-semibold text-ink shadow-sm transition hover:border-ink/30 hover:shadow disabled:opacity-60";

  return (
    <AuthShell
      tone="blue"
      scene="creators"
      title="Write it once. Post it everywhere."
      sub="Plan the week, tailor each post for every network, and let Postbase publish it on time."
    >
      {sent ? (
        <div className="swap-in text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#2b59d9] text-white shadow-[0_18px_40px_-18px_rgba(43,89,217,0.8)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6L2 7" />
            </svg>
          </span>
          <h1 className="mt-6 font-display text-[30px] font-semibold tracking-[-0.025em] text-ink">Check your inbox</h1>
          <p className="mx-auto mt-2.5 max-w-[34ch] text-[15px] leading-relaxed text-muted">
            We sent a sign-in link to <b className="font-semibold text-ink">{email}</b>. Open it on this device to finish
            signing in.
          </p>
          {error ? <p className="mt-4 text-[13px] text-terra">{error}</p> : null}
          <div className="mt-7 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={sendLink}
              disabled={cooldown > 0 || loading}
              className="h-12 rounded-full border border-line bg-surface text-[15px] font-semibold text-ink shadow-sm transition hover:border-ink/30 disabled:cursor-default disabled:opacity-60"
            >
              {loading ? "Sending…" : cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setError(null);
              }}
              className="h-11 text-[14px] font-semibold text-blue-ink hover:underline"
            >
              Use a different email
            </button>
          </div>
          <p className="mt-6 text-[12.5px] text-muted">Can&apos;t find it? Check your spam or promotions folder.</p>
        </div>
      ) : (
        <div className="swap-in">
          <h1 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.03em] text-ink">Welcome to Postbase</h1>
          <p className="mt-2 text-[15px] text-muted">Sign in or create an account. No password needed.</p>

          <div className="mt-8 flex flex-col gap-3">
            <button type="button" onClick={() => oauth("google")} disabled={oauthBusy !== null} className={provider}>
              <GoogleIcon />
              {oauthBusy === "google" ? "Redirecting…" : "Continue with Google"}
            </button>
            <button type="button" onClick={() => oauth("github")} disabled={oauthBusy !== null} className={provider}>
              <GitHubIcon />
              {oauthBusy === "github" ? "Redirecting…" : "Continue with GitHub"}
            </button>
          </div>

          <div className="my-7 flex items-center gap-3 text-[12.5px] text-muted">
            <span className="h-px flex-1 bg-line" />
            or continue with email
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="text-[13px] font-medium text-ink" htmlFor="email">
              Email
            </label>
            <div className="flex h-12 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 transition focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/25">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70"
              />
            </div>
            {error ? (
              <p role="alert" className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed text-terra">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
            >
              {loading ? "Sending…" : "Continue with email"}
              {!loading ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              ) : null}
            </button>
          </form>

          <p className="mt-6 text-center text-[12.5px] leading-relaxed text-muted">
            We&apos;ll email you a magic link. By continuing you agree to our{" "}
            <a href="/terms" className="text-blue-ink underline underline-offset-2">Terms</a> and{" "}
            <a href="/privacy" className="text-blue-ink underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      )}
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
