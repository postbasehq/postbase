"use client";

import { useState } from "react";
import Link from "next/link";

const LABEL: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
};

type Channel = { id: string; platform: string; handle: string | null };

/**
 * Channel picker with optional per-channel variants. Submits `channels` (one hidden
 * input per selected id) and `variants` (JSON map of channelId -> custom text).
 * A channel with a variant publishes that text instead of the default post.
 */
export function ChannelSelect({
  channels,
  initialSelected = [],
  initialVariants = {},
}: {
  channels: Channel[];
  initialSelected?: string[];
  initialVariants?: Record<string, string>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [variants, setVariants] = useState<Record<string, string>>(initialVariants);
  const [open, setOpen] = useState<Set<string>>(new Set(Object.keys(initialVariants)));

  if (channels.length === 0) {
    return (
      <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-sm text-muted">
        No channels yet.{" "}
        <Link href="/channels" className="font-medium text-blue-ink underline">
          Add one first
        </Link>
        .
      </p>
    );
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const openVariant = (id: string) => setOpen((s) => new Set(s).add(id));
  const closeVariant = (id: string) => {
    setOpen((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    setVariants((v) => {
      const n = { ...v };
      delete n[id];
      return n;
    });
  };

  const selectedChannels = channels.filter((c) => selected.has(c.id));
  const variantsJson = JSON.stringify(
    Object.fromEntries(
      Object.entries(variants).filter(([k, v]) => selected.has(k) && v.trim()),
    ),
  );

  return (
    <fieldset className="flex flex-col gap-3">
      <span className="text-[13px] font-medium text-muted">Channels</span>

      <div className="flex flex-wrap gap-2">
        {channels.map((c) => {
          const on = selected.has(c.id);
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm ${
                on ? "border-blue bg-blue-soft text-blue-ink" : "border-line bg-ground"
              }`}
            >
              <span className="font-medium">{LABEL[c.platform] ?? c.platform}</span>
              {c.handle ? <span className="text-muted">{c.handle}</span> : null}
            </button>
          );
        })}
      </div>

      {selectedChannels.length > 0 ? (
        <div className="flex flex-col gap-2">
          {selectedChannels.map((c) =>
            open.has(c.id) ? (
              <div key={c.id} className="rounded-xl border border-line bg-ground p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted">
                    {LABEL[c.platform] ?? c.platform} variant
                  </span>
                  <button
                    type="button"
                    onClick={() => closeVariant(c.id)}
                    className="ml-auto text-xs text-muted hover:text-terra"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={variants[c.id] ?? ""}
                  onChange={(e) =>
                    setVariants((v) => ({ ...v, [c.id]: e.target.value }))
                  }
                  rows={2}
                  placeholder={`Custom text for ${LABEL[c.platform] ?? c.platform} — overrides the default`}
                  className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus-visible:border-blue"
                />
              </div>
            ) : (
              <button
                type="button"
                key={c.id}
                onClick={() => openVariant(c.id)}
                className="self-start text-xs font-medium text-blue-ink hover:underline"
              >
                + Customize for {LABEL[c.platform] ?? c.platform}
              </button>
            ),
          )}
        </div>
      ) : null}

      {[...selected].map((id) => (
        <input key={id} type="hidden" name="channels" value={id} />
      ))}
      <input type="hidden" name="variants" value={variantsJson} />
    </fieldset>
  );
}
