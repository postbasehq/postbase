"use client";

import { useEffect, useRef, useState } from "react";
import { AGENT_MODELS } from "@/lib/agent/models";

/**
 * Compact model picker for the composer. Lists only models whose provider is
 * configured (has an API key), each with a one-line description; with just one,
 * it's a plain label. Opens upward since it lives at the bottom.
 */
export function AgentModelSelector({
  value,
  onChange,
  ready,
}: {
  value: string;
  onChange: (id: string) => void;
  ready: { anthropic: boolean; openai: boolean };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const models = AGENT_MODELS.filter((m) => ready[m.provider]);
  const current = models.find((m) => m.id === value) ?? models[0] ?? AGENT_MODELS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (models.length <= 1) {
    return <span className="px-2 py-1 text-[12px] font-medium text-muted">{current.label}</span>;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-muted transition hover:text-ink"
      >
        {current.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {models.map((m) => {
            const active = m.id === current.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition ${
                  active ? "bg-blue-soft" : "hover:bg-surface-2"
                }`}
              >
                <span className="flex w-full items-center gap-2 text-sm font-medium text-ink">
                  {m.label}
                  {active ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-blue-ink" aria-hidden>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : null}
                </span>
                <span className="text-[12px] text-muted">{m.description}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
