"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MastodonForm } from "@/components/MastodonForm";

export function MastodonConnect() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="size-2.5 rounded-full" style={{ background: "#6364FF" }} />
        <div>
          <div className="text-sm font-semibold">Mastodon</div>
          <div className="text-xs text-muted">Connect any instance with an access token.</div>
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
        <div className="mt-4 border-t border-line pt-4">
          <MastodonForm
            onConnected={() => {
              setOpen(false);
              router.refresh();
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
