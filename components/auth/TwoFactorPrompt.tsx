"use client";

import { useActionState, useState } from "react";
import { verifySignIn, type VerifyState } from "@/app/login/verify/actions";
import { SubmitButton } from "@/components/SubmitButton";

/** The 6-digit code step of sign-in, for accounts with two-factor turned on. */
export function TwoFactorPrompt({
  email,
  factors,
  next,
}: {
  email: string;
  factors: { id: string; name: string }[];
  next: string;
}) {
  const [state, action] = useActionState<VerifyState, FormData>(verifySignIn, {});
  const [factorId, setFactorId] = useState(factors[0]?.id ?? "");
  const [lost, setLost] = useState(false);

  return (
    <div className="swap-in">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-[#2b59d9] text-white shadow-[0_18px_40px_-18px_rgba(43,89,217,0.8)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <h1 className="mt-6 font-display text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink">Enter your code</h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
        <b className="font-semibold text-ink">{email}</b> has two-factor sign-in on. Open your authenticator app and enter the
        6-digit code for Postbase.
      </p>

      <form action={action} className="mt-7 flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="factor_id" value={factorId} />
        {factors.length > 1 ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink">Device</span>
            <select
              value={factorId}
              onChange={(e) => setFactorId(e.target.value)}
              className="h-12 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none focus:border-blue"
            >
              {factors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-[13px] font-medium text-ink" htmlFor="code">
          Code
        </label>
        <input
          id="code"
          name="code"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          placeholder="123456"
          className="h-12 rounded-xl border border-line bg-surface px-3.5 font-mono text-[20px] tracking-[0.3em] text-ink outline-none transition placeholder:text-muted/50 focus:border-blue focus:ring-2 focus:ring-blue/25"
        />
        {state.error ? (
          <p role="alert" className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed text-[#d14a3e]">
            {state.error}
          </p>
        ) : null}
        <SubmitButton
          pendingLabel="Checking…"
          className="mt-1 h-12 rounded-full bg-blue font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
        >
          Verify and continue
        </SubmitButton>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13.5px]">
        <button type="button" onClick={() => setLost((v) => !v)} className="font-semibold text-blue-ink hover:underline">
          Lost your device?
        </button>
        <form action="/auth/signout" method="post">
          <button type="submit" className="font-semibold text-muted hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
      {lost ? (
        <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-muted">
          {factors.length > 1 ? (
            <p className="mb-2">You set up more than one device. Pick another one above and use its code.</p>
          ) : null}
          <p>
            Email <a href="mailto:team@postbase.so?subject=Two-factor%20reset" className="font-semibold text-blue-ink underline underline-offset-2">team@postbase.so</a>{" "}
            from <b className="font-semibold text-ink">{email}</b>. We&apos;ll confirm it&apos;s you, then turn two-factor off so you can
            sign in and set it up again. Scheduled posts keep going out in the meantime.
          </p>
        </div>
      ) : null}
    </div>
  );
}
