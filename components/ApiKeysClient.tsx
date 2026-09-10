"use client";

import { useActionState } from "react";
import { createApiKey, revokeApiKey, type CreateKeyState } from "@/app/(app)/apikey-actions";

type KeyRow = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ApiKeysClient({ keys }: { keys: KeyRow[] }) {
  const [state, action, pending] = useActionState<CreateKeyState, FormData>(createApiKey, {});

  return (
    <div className="flex flex-col gap-6">
      {/* one-time key reveal */}
      {state.key ? (
        <div className="rounded-2xl border border-blue bg-blue-soft p-4">
          <p className="text-sm font-semibold text-blue-ink">
            Copy your key now — you won’t see it again.
          </p>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-surface px-3 py-2.5 font-mono text-[13px]">
            {state.key}
          </code>
        </div>
      ) : null}

      {/* create */}
      <form action={action} className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Label</span>
          <input
            name="label"
            placeholder="e.g. Claude on my laptop"
            className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate key"}
        </button>
      </form>
      {state.error ? <p className="text-[13px] text-terra">{state.error}</p> : null}

      {/* list */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {keys.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">No API keys yet.</p>
        ) : (
          keys.map((k, i) => (
            <div
              key={k.id}
              className={`flex items-center gap-3 px-4 py-3.5 ${
                i < keys.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold">{k.label ?? "Key"}</div>
                <div className="truncate text-xs text-muted">
                  Created {fmt(k.created_at)} · last used {fmt(k.last_used_at)}
                </div>
              </div>
              <form action={revokeApiKey} className="ml-auto">
                <input type="hidden" name="id" value={k.id} />
                <button type="submit" className="text-xs font-medium text-muted hover:text-terra">
                  Revoke
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
