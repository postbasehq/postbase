"use client";

import { useActionState, useEffect } from "react";
import { connectMastodonChannel, type ConnectMastodonState } from "@/app/(app)/actions";

/**
 * Mastodon connect form (instance URL + access token). Reused on the Channels
 * page and in the onboarding wizard. Calls `onConnected` once linked.
 */
export function MastodonForm({
  onConnected,
  onCancel,
}: {
  onConnected: () => void;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState<ConnectMastodonState, FormData>(
    connectMastodonChannel,
    {},
  );

  useEffect(() => {
    if (state?.ok) onConnected();
  }, [state, onConnected]);

  return (
    <form action={action} className="flex flex-col gap-2.5 text-left">
      <div className="rounded-xl bg-surface-2 p-3.5">
        <div className="text-[13px] font-semibold">To connect Mastodon:</div>
        <ol className="mt-1.5 flex flex-col gap-1 text-xs text-muted">
          <li>
            <span className="font-semibold text-ink">1.</span> On your instance, open{" "}
            <span className="font-medium text-ink">Preferences → Development → New application</span>
          </li>
          <li>
            <span className="font-semibold text-ink">2.</span> Name it, tick{" "}
            <span className="font-medium text-ink">read</span> and{" "}
            <span className="font-medium text-ink">write</span>, then submit
          </li>
          <li>
            <span className="font-semibold text-ink">3.</span> Copy{" "}
            <span className="font-medium text-ink">Your access token</span> and paste it below
          </li>
        </ol>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">Instance URL</span>
        <input
          name="instance"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="mastodon.social"
          className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">Access token</span>
        <input
          name="access_token"
          type="password"
          required
          autoComplete="off"
          placeholder="your access token"
          className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
        />
      </label>
      <p className="text-xs text-muted">
        The token grants posting access only. Revoke it anytime from that same page.
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
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
