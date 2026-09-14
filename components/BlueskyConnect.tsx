"use client";

import { useActionState, useState } from "react";
import { connectBlueskyChannel, type ConnectBlueskyState } from "@/app/(app)/actions";

export function BlueskyConnect() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ConnectBlueskyState, FormData>(
    connectBlueskyChannel,
    {},
  );

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="size-2.5 rounded-full" style={{ background: "#0085FF" }} />
        <div>
          <div className="text-sm font-semibold">Bluesky</div>
          <div className="text-xs text-muted">Connect with your handle and an app password.</div>
        </div>
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="ml-auto rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
          >
            Connect Bluesky
          </button>
        ) : null}
      </div>

      {open ? (
        <form action={action} className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4">
          {/* how-to guide */}
          <div className="rounded-xl bg-surface-2 p-3.5">
            <div className="text-[13px] font-semibold">To connect Bluesky:</div>
            <ol className="mt-1.5 flex flex-col gap-1 text-xs text-muted">
              <li>
                <span className="font-semibold text-ink">1.</span> Open your Bluesky App Passwords
                and click <span className="font-medium text-ink">Add App Password</span>
              </li>
              <li>
                <span className="font-semibold text-ink">2.</span> Copy the generated password
                (<code className="rounded bg-surface px-1 py-0.5 text-[11px]">xxxx-xxxx-xxxx-xxxx</code>)
              </li>
              <li>
                <span className="font-semibold text-ink">3.</span> Paste it below with your handle
              </li>
            </ol>
            <a
              href="https://bsky.app/settings/app-passwords"
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-blue-ink hover:bg-surface-2"
            >
              Open Bluesky App Passwords ↗
            </a>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-muted">Handle</span>
            <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-ground focus-within:border-blue">
              <input
                name="handle"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="yourname"
                className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm outline-none"
              />
              <span className="flex items-center border-l border-line bg-surface-2 px-3 text-sm text-muted">
                .bsky.social
              </span>
            </div>
            <span className="text-xs text-muted">
              Just your username. Using a custom domain? Type your full handle.
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-muted">App password</span>
            <input
              name="app_password"
              type="password"
              required
              autoComplete="off"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
            />
          </label>
          <p className="text-xs text-muted">
            This is an app-specific password, not your main Bluesky password. Revoke it anytime.
          </p>
          {state?.error ? <p className="text-[13px] text-terra">{state.error}</p> : null}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm disabled:opacity-60"
            >
              {pending ? "Connecting…" : "Connect"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
