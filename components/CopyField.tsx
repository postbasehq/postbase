"use client";

import { useState } from "react";

/** Read-only field with a copy button — for sharing invite links. */
export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-line bg-ground px-3 py-1.5 text-xs text-muted outline-none"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked — the field is selectable to copy manually */
          }
        }}
        className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-blue-ink hover:bg-surface-2"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
