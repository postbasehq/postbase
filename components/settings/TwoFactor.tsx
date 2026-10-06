"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmTwoFactor, removeTwoFactor, startTwoFactor } from "@/app/(app)/settings-actions";

/** `added` is formatted on the server, so it hydrates without a locale mismatch. */
type Device = { id: string; name: string; added: string };

const codeInput =
  "w-36 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[16px] tracking-[0.25em] text-ink outline-none focus:border-ink";
const primary =
  "rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-50";
const secondary =
  "rounded-full border border-line bg-surface px-4 py-2 font-display text-sm font-semibold text-ink shadow-sm transition-colors hover:border-ink disabled:opacity-50";

/**
 * Settings → Security: authenticator-app (TOTP) two-factor sign-in. Set up a
 * device by scanning a QR code and entering its first code; remove one with a
 * fresh code. A second device is the backup, since Supabase has no backup codes.
 */
export function TwoFactor({ devices, max }: { devices: Device[]; max: number }) {
  const on = devices.length > 0;
  const [setup, setSetup] = useState<{ step: "name" } | { step: "scan"; factorId: string; qr: string; secret: string } | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function reset() {
    setSetup(null);
    setRemoving(null);
    setName("");
    setCode("");
    setError(null);
  }

  function begin() {
    setError(null);
    start(async () => {
      const r = await startTwoFactor(name);
      if (r.error || !r.factorId) setError(r.error ?? "Couldn’t start setup. Try again.");
      else setSetup({ step: "scan", factorId: r.factorId, qr: r.qr!, secret: r.secret! });
    });
  }

  // The code check swaps the session cookies mid-action, so re-fetch the page
  // afterwards rather than trust the action's own re-render.
  function done() {
    reset();
    router.refresh();
  }

  function confirm(factorId: string) {
    setError(null);
    start(async () => {
      const r = await confirmTwoFactor(factorId, code);
      if (r.error) setError(r.error);
      else done();
    });
  }

  function remove(factorId: string) {
    setError(null);
    start(async () => {
      const r = await removeTwoFactor(factorId, code);
      if (r.error) setError(r.error);
      else done();
    });
  }

  const errorLine = error ? <p className="text-[13px] font-medium text-[#d14a3e]">{error}</p> : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[14px] font-medium text-ink">
            Two-factor sign-in
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? "bg-[#2b59d9] text-white" : "bg-surface-2 text-muted ring-1 ring-line"}`}
            >
              {on ? "On" : "Off"}
            </span>
          </div>
          <div className="text-[12px] text-muted">
            {on
              ? "After Google, GitHub or your email link, Postbase asks for a code from your authenticator app."
              : "Ask for a 6-digit code from an authenticator app (1Password, Google Authenticator, Authy…) each time you sign in."}
          </div>
        </div>
        {!setup && devices.length < max ? (
          <button
            type="button"
            onClick={() => {
              reset();
              setSetup({ step: "name" });
            }}
            className={on ? secondary : primary}
          >
            {on ? "Add a backup device" : "Turn on"}
          </button>
        ) : null}
      </div>

      {setup ? (
        <div className="rounded-2xl border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-ink">
          {setup.step === "name" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                begin();
              }}
              className="flex flex-col gap-3"
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-muted">Name this device so you can tell them apart</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={on ? "Backup device" : "Authenticator app"}
                  maxLength={40}
                  autoFocus
                  className="max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-ink"
                />
              </label>
              {errorLine}
              <div className="flex flex-wrap items-center gap-2">
                <button type="submit" disabled={pending} className={primary}>
                  {pending ? "Starting…" : "Continue"}
                </button>
                <button type="button" onClick={reset} className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirm(setup.factorId);
              }}
              className="flex flex-col gap-4 sm:flex-row sm:items-start"
            >
              {/* Supabase returns the QR as an SVG data URL; dark modules need a white ground. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qr} alt="QR code to scan with your authenticator app" className="size-44 shrink-0 rounded-xl bg-white p-2.5" />
              <div className="flex min-w-0 flex-col gap-3">
                <p>
                  <span className="font-semibold">1.</span> Scan this with your authenticator app.
                  <span className="text-muted"> Can&apos;t scan? Enter this key instead:</span>
                </p>
                <code className="w-fit select-all break-all rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[12.5px] tracking-wider">
                  {setup.secret.match(/.{1,4}/g)?.join(" ")}
                </code>
                <label className="flex flex-col gap-1.5">
                  <span>
                    <span className="font-semibold">2.</span> Enter the 6-digit code it shows
                  </span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={7}
                    placeholder="123456"
                    autoFocus
                    className={codeInput}
                  />
                </label>
                {errorLine}
                <div className="flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={pending} className={primary}>
                    {pending ? "Checking…" : on ? "Verify and add" : "Verify and turn on"}
                  </button>
                  <button type="button" onClick={reset} className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {on ? (
        <div>
          <div className="text-[13px] text-muted">Your devices</div>
          <ul className="mt-1">
            {devices.map((d, i) => (
              <li key={d.id} className={`py-3 ${i < devices.length - 1 ? "border-b border-line" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-ink">{d.name}</div>
                    <div className="text-[12px] text-muted">Added {d.added}</div>
                  </div>
                  {removing !== d.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        setRemoving(d.id);
                      }}
                      className="text-[13px] font-semibold text-[#d14a3e] hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                {removing === d.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      remove(d.id);
                    }}
                    className="mt-3 flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-[13px]"
                  >
                    <label className="flex flex-col gap-1.5">
                      <span className="text-muted">
                        {devices.length === 1
                          ? "Enter a current code from this device. Removing it turns two-factor sign-in off."
                          : "Enter a current code from this device, or from another of your devices if this one is lost."}
                      </span>
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={7}
                        placeholder="123456"
                        autoFocus
                        className={codeInput}
                      />
                    </label>
                    {errorLine}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-full bg-[#d14a3e] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                      >
                        {pending ? "Removing…" : devices.length === 1 ? "Remove and turn off" : "Remove device"}
                      </button>
                      <button type="button" onClick={reset} className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-line bg-surface-2 p-4 text-[12.5px] leading-relaxed text-muted">
        <span className="font-semibold text-ink">If you lose your phone.</span> There are no backup codes, so add a second device as
        your backup: another phone, a tablet, or a password manager that stores codes.
        {on && devices.length === 1 ? " You only have one right now." : ""} If every device is gone, email{" "}
        <a href="mailto:team@postbase.so?subject=Two-factor%20reset" className="font-semibold text-blue-ink underline underline-offset-2">
          team@postbase.so
        </a>{" "}
        from your account&apos;s email address. We&apos;ll confirm it&apos;s you, then turn two-factor off so you can set it up again.
      </div>
    </div>
  );
}
