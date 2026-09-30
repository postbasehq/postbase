"use client";

import { useEffect, useState } from "react";
import { THEME_EVENT, applyTheme, readThemeChoice, type ThemeChoice } from "@/lib/theme";

// Fixed palettes for the previews, so each tile shows its theme whatever is active.
const DARK = { ground: "#202124", surface: "#292a2d", line: "#3c4043", ink: "#e8eaed", muted: "#5f6368" };
const LIGHT = { ground: "#f8f9fa", surface: "#ffffff", line: "#dadce0", ink: "#202124", muted: "#bdc1c6" };

const OPTIONS: { id: ThemeChoice; label: string; note?: string }[] = [
  { id: "dark", label: "Dark", note: "Default" },
  { id: "light", label: "Light" },
  { id: "system", label: "Match system" },
];

/** Dark, Light or Match system, each shown as a tiny app window. Saved on this device. */
export function ThemePicker() {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    setChoice(readThemeChoice());
    // The header toggle can change it too.
    const sync = () => setChoice(readThemeChoice());
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  return (
    <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((o) => {
        const on = choice === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              applyTheme(o.id);
              setChoice(o.id);
            }}
            className={`rounded-2xl border bg-surface p-2 text-left transition-colors ${
              on ? "border-[#2b59d9] ring-1 ring-[#2b59d9]" : "border-line hover:border-muted"
            }`}
          >
            <Preview kind={o.id} />
            <span className="flex items-center justify-between gap-2 px-1.5 pb-1 pt-2.5">
              <span className="font-display text-[14px] font-semibold text-ink">{o.label}</span>
              {on ? (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                  <circle cx="9" cy="9" r="9" fill="#2b59d9" />
                  <path d="m5.2 9.3 2.5 2.5 5-5.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : o.note ? (
                <span className="text-[12px] text-muted">{o.note}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Preview({ kind }: { kind: ThemeChoice }) {
  if (kind === "system") {
    // Half and half, split down the middle.
    return (
      <span className="relative block h-[92px] overflow-hidden rounded-xl border border-line">
        <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          <span className="absolute inset-y-0 left-0 w-[200%]">
            <Window p={DARK} />
          </span>
        </span>
        <span className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
          <span className="absolute inset-y-0 right-0 w-[200%]">
            <Window p={LIGHT} />
          </span>
        </span>
      </span>
    );
  }
  return (
    <span className="relative block h-[92px] overflow-hidden rounded-xl border border-line">
      <Window p={kind === "dark" ? DARK : LIGHT} />
    </span>
  );
}

/** A sidebar, a header bar and a calendar week with three posts, in solid brand colours. */
function Window({ p }: { p: typeof DARK }) {
  return (
    <span className="absolute inset-0 flex gap-1.5 p-2" style={{ background: p.ground }}>
      <span className="flex w-[22%] flex-col gap-1.5 pt-0.5">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-[#2b59d9]" />
        {[70, 55, 62, 48].map((w) => (
          <span key={w} className="h-1 rounded-full" style={{ width: `${w}%`, background: p.muted }} />
        ))}
      </span>
      <span className="flex flex-1 flex-col gap-1.5 rounded-md p-1.5" style={{ background: p.surface, boxShadow: `inset 0 0 0 1px ${p.line}` }}>
        <span className="h-1.5 w-1/3 rounded-full" style={{ background: p.ink }} />
        <span className="grid flex-1 grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((c) => (
            <span key={c} className="relative rounded-[3px]" style={{ boxShadow: `inset 0 0 0 1px ${p.line}` }}>
              {c === 0 ? <span className="absolute inset-x-0.5 top-1 h-2 rounded-[2px] bg-[#2b59d9]" /> : null}
              {c === 2 ? <span className="absolute inset-x-0.5 top-4 h-2 rounded-[2px] bg-[#e3a72c]" /> : null}
              {c === 3 ? <span className="absolute inset-x-0.5 top-2 h-2 rounded-[2px] bg-[#d14a3e]" /> : null}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
