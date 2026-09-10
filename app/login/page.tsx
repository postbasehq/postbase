"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch {
      setError("Auth isn’t configured yet — add your Supabase keys to .env.local.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <nav className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center px-6">
          <Logo />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] rounded-2xl border border-line bg-surface p-7 shadow-md">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">
            Sign in to Postbase
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            We’ll email you a magic link — no password needed.
          </p>

          {sent ? (
            <div className="mt-6 rounded-xl bg-blue-soft px-4 py-4 text-sm text-blue-ink">
              Check your inbox — we sent a sign-in link to <b>{email}</b>.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
              <label className="text-[13px] font-medium text-muted" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30"
              />
              {error ? <p className="text-[13px] text-terra">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-xs text-muted">
            By continuing you agree to our{" "}
            <a href="/terms" className="text-blue-ink underline">Terms</a> and{" "}
            <a href="/privacy" className="text-blue-ink underline">Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
