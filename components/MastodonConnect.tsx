"use client";

import { useState } from "react";

export function MastodonConnect() {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState("");

  function go() {
    const v = instance.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (v) window.location.href = `/api/connect/mastodon?instance=${encodeURIComponent(v)}`;
  }

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="size-2.5 rounded-full" style={{ background: "#6364FF" }} />
        <div>
          <div className="text-sm font-semibold">Mastodon</div>
          <div className="text-xs text-muted">Connect any instance — approve on your server.</div>
        </div>
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="ml-auto rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
          >
            Connect Mastodon
          </button>
        ) : null}
      </div>

      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          className="mt-4 flex flex-col gap-2 border-t border-line pt-4"
        >
          <span className="text-[13px] font-medium text-muted">Your Mastodon server</span>
          <div className="flex items-center rounded-xl border border-line bg-ground px-3.5 focus-within:border-blue">
            <span className="text-sm text-muted">https://</span>
            <input
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              autoFocus
              spellCheck={false}
              placeholder="mastodon.social"
              className="min-w-0 flex-1 bg-transparent py-2.5 pl-1 text-sm outline-none"
            />
          </div>
          <span className="text-xs text-muted">
            You&rsquo;ll approve access on your Mastodon server, then come back — no app to create.
          </span>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm"
            >
              Continue →
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
