"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { connectBlueskyChannel, type ConnectBlueskyState } from "@/app/(app)/actions";
import { CANCEL_CLS, PRIMARY_CLS } from "@/components/dialog-buttons";

/**
 * The Bluesky connect form (handle + app password). Reused on the Channels page
 * and in the onboarding wizard. Calls `onConnected` once the account is linked.
 */
export function BlueskyForm({
  onConnected,
  onCancel,
}: {
  onConnected: () => void;
  onCancel?: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [inputWidth, setInputWidth] = useState(0);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [state, action, pending] = useActionState<ConnectBlueskyState, FormData>(
    connectBlueskyChannel,
    {},
  );

  // Size the input to its text so ".bsky.social" hugs right after it.
  useEffect(() => {
    if (measureRef.current) setInputWidth(measureRef.current.offsetWidth);
  }, [handle]);

  // Notify the parent when the connection succeeds.
  useEffect(() => {
    if (state?.ok) onConnected();
  }, [state, onConnected]);

  return (
    <form action={action} className="flex flex-col gap-3.5 text-left">
      <ol className="flex flex-col gap-1.5 text-[13px] text-muted">
        <li className="flex gap-2.5">
          <span className="font-semibold text-ink">1</span>
          <span>
            Open{" "}
            <a
              href="https://bsky.app/settings/app-passwords"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-ink underline decoration-line underline-offset-2 hover:decoration-current"
            >
              App passwords
            </a>{" "}
            in Bluesky (Settings → Privacy and security).
          </span>
        </li>
        <li className="flex gap-2.5">
          <span className="font-semibold text-ink">2</span>
          <span>Add one and copy it.</span>
        </li>
        <li className="flex gap-2.5">
          <span className="font-semibold text-ink">3</span>
          <span>Paste it below with your handle.</span>
        </li>
      </ol>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-ink">Handle</span>
        <div className="flex items-center overflow-x-auto rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm focus-within:border-blue">
          <span
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute whitespace-pre text-sm"
          >
            {handle || "yourname"}
          </span>
          <input
            name="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="yourname"
            style={{ width: Math.max(inputWidth, 8) }}
            className="bg-transparent outline-none"
          />
          <span className="shrink-0 text-muted">.bsky.social</span>
        </div>
        <span className="text-xs text-muted">Using your own domain? Type the full handle.</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-ink">App password</span>
        <input
          name="app_password"
          type="password"
          required
          autoComplete="off"
          placeholder="xxxx-xxxx-xxxx-xxxx"
          className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
        />
      </label>
      {state?.error ? <p className="text-[13px] text-[#d14a3e]">{state.error}</p> : null}

      <div className="mt-1.5 flex items-center justify-end gap-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className={CANCEL_CLS}>
            Cancel
          </button>
        ) : null}
        <button type="submit" disabled={pending} className={PRIMARY_CLS}>
          {pending ? "Connecting…" : "Connect"}
        </button>
      </div>
    </form>
  );
}
