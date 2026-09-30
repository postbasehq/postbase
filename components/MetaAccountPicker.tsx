"use client";

import { useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { Modal } from "@/components/Modal";
import { SubmitButton } from "@/components/SubmitButton";

type Option = { id: string; name: string; handle: string; avatarUrl: string | null; connected: boolean };

/**
 * After signing in with Facebook, one login can reach several Instagram
 * accounts or Pages. This asks which to connect (ones already connected are
 * pre-ticked, so saving refreshes them), instead of silently taking the first.
 */
export function MetaAccountPicker({
  platform,
  options,
  connectAction,
  cancelAction,
}: {
  platform: "instagram" | "facebook";
  options: Option[];
  connectAction: (formData: FormData) => Promise<void>;
  cancelAction: () => Promise<void>;
}) {
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(options.filter((o) => o.connected).map((o) => o.id)),
  );
  const label = platform === "instagram" ? "Instagram" : "Facebook";
  const noun = platform === "instagram" ? "accounts" : "Pages";
  const toggle = (id: string) =>
    setChosen((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <Modal open onClose={() => cancelAction()} labelledBy="meta-pick-title">
      <form action={connectAction}>
        <div className="flex items-center gap-3">
          <BrandTile platform={platform} size={40} radius={10} />
          <div>
            <h3 id="meta-pick-title" className="font-display text-lg font-semibold">
              Choose {label} {noun}
            </h3>
            <p className="text-[13px] text-muted">
              Your Facebook login manages {options.length} {noun}. Pick the ones to post to.
            </p>
          </div>
        </div>

        <ul className="mt-4 flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {options.map((o) => {
            const on = chosen.has(o.id);
            return (
              <li key={o.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    on ? "border-[#2b59d9] bg-surface-2" : "border-line hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="account"
                    value={o.id}
                    checked={on}
                    onChange={() => toggle(o.id)}
                    className="size-4 shrink-0 rounded border-line text-blue"
                  />
                  {o.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover ring-1 ring-line" />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-line">
                      <BrandTile platform={platform} size={24} radius={12} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{o.name}</span>
                    {o.handle !== o.name ? (
                      <span className="block truncate text-xs text-muted">{o.handle}</span>
                    ) : null}
                  </span>
                  {o.connected ? <span className="shrink-0 text-[11px] font-semibold text-green">Connected</span> : null}
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => cancelAction()}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            Cancel
          </button>
          <SubmitButton
            disabled={chosen.size === 0}
            pendingLabel="Connecting…"
            className="rounded-full bg-[#2b59d9] px-5 py-2 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-50"
          >
            {chosen.size > 1 ? `Connect ${chosen.size} ${noun}` : "Connect"}
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
