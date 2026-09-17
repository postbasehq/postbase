"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A small, theme-aware date + time picker that replaces the native
 * datetime-local popup. Controlled via `value` ("YYYY-MM-DDTHH:MM" local
 * wall-clock, or "") and `onChange`. Opens upward (it lives in a bottom footer).
 */

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (y: number, m: number, d: number, hh: number, mm: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}T${pad(hh)}:${pad(mm)}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export function DateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const parsed = (() => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  })();

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const [view, setView] = useState(() => {
    const base = parsed ?? new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  // Re-centre the month on the selected date each time the popover opens.
  useEffect(() => {
    if (!open) return;
    const base = parsed ?? new Date();
    setView({ y: base.getFullYear(), m: base.getMonth() });
    // parsed intentionally read at open time only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selHour = parsed ? parsed.getHours() : 9;
  const selMin = parsed ? (Math.round(parsed.getMinutes() / 5) * 5) % 60 : 0;

  const pickDay = (date: Date) =>
    onChange(fmt(date.getFullYear(), date.getMonth(), date.getDate(), selHour, selMin));
  const setTime = (hh: number, mm: number) => {
    const base = parsed ?? new Date();
    onChange(fmt(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm));
  };

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  // 6-week grid, Monday-first.
  const first = new Date(view.y, view.m, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - startOffset + 1;
    return { date: new Date(view.y, view.m, dayNum), inMonth: dayNum >= 1 && dayNum <= daysInMonth };
  });

  const now = new Date();
  const label = parsed
    ? parsed.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "Schedule a time";

  const selectCls =
    "rounded-md bg-surface-2 px-2 py-1 text-sm tabular-nums text-ink outline-none focus-visible:ring-1 focus-visible:ring-blue";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg border bg-ground px-2.5 py-2 text-sm transition-colors ${
          open ? "border-blue" : "border-line hover:border-blue/60"
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className={parsed ? "text-ink" : "text-muted"}>{label}</span>
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[290px] rounded-2xl border border-line bg-surface p-3 shadow-[0_18px_50px_-16px_rgba(16,24,40,0.45)]">
          {/* month header */}
          <div className="flex items-center justify-between px-1 pb-2">
            <div className="font-display text-sm font-semibold tracking-[-0.01em]">
              {MONTHS[view.m]} {view.y}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="flex size-7 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="flex size-7 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* weekday labels */}
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((c, i) => {
              const past = c.date < todayMidnight;
              const selected = parsed != null && sameDay(c.date, parsed);
              const isToday = sameDay(c.date, now);
              const disabled = past || !c.inMonth;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDay(c.date)}
                  className={`flex h-9 items-center justify-center rounded-lg text-sm tabular-nums transition ${
                    selected
                      ? "bg-blue font-semibold text-on-blue"
                      : isToday
                        ? "font-semibold text-blue-ink ring-1 ring-inset ring-blue/50 hover:bg-surface-2"
                        : !c.inMonth || past
                          ? "text-muted/35"
                          : "text-ink hover:bg-surface-2"
                  } disabled:cursor-default disabled:hover:bg-transparent`}
                >
                  {c.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* time */}
          <div className="mt-3 flex items-center gap-2 border-t border-line px-1 pt-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span className="text-xs font-medium text-muted">Time</span>
            <div className="ml-auto flex items-center gap-1">
              <select
                aria-label="Hour"
                value={selHour}
                onChange={(e) => setTime(Number(e.target.value), selMin)}
                className={selectCls}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {pad(h)}
                  </option>
                ))}
              </select>
              <span className="text-muted">:</span>
              <select
                aria-label="Minute"
                value={selMin}
                onChange={(e) => setTime(selHour, Number(e.target.value))}
                className={selectCls}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {pad(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* actions */}
          <div className="mt-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs font-medium text-muted transition-colors hover:text-terra"
            >
              Clear
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const n = new Date();
                  onChange(
                    fmt(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), Math.round(n.getMinutes() / 5) * 5 % 60),
                  );
                }}
                className="text-xs font-semibold text-blue-ink hover:underline"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-blue px-3.5 py-1.5 text-xs font-semibold text-on-blue shadow-sm transition-shadow hover:shadow"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
