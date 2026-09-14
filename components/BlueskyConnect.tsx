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
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-muted">Handle</span>
            <input
              name="handle"
              required
              autoComplete="off"
              placeholder="you.bsky.social"
              className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
            />
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
            Create one at{" "}
            <a
              href="https://bsky.app/settings/app-passwords"
              target="_blank"
              rel="noreferrer"
              className="text-blue-ink underline"
            >
              bsky.app → Settings → App Passwords
            </a>
            . Not your main password.
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
