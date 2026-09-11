"use client";

import { useState } from "react";

// UTC ISO -> "YYYY-MM-DDTHH:mm" in the browser's local timezone (for the input).
function utcToLocalInput(utc?: string | null): string {
  if (!utc) return "";
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * datetime-local input (in the user's local time) that submits a correct UTC ISO
 * in a hidden `scheduled_at` field. The browser owns the timezone conversion, so
 * the server stores an unambiguous instant regardless of its own timezone.
 */
export function ScheduleField({ defaultUtc }: { defaultUtc?: string | null }) {
  const [local, setLocal] = useState<string>(() => utcToLocalInput(defaultUtc));

  let utc = "";
  if (local) {
    const d = new Date(local);
    if (!Number.isNaN(d.getTime())) utc = d.toISOString();
  }

  let tz = "your timezone";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // keep default label
  }

  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted">
        Schedule for <span className="font-normal">(leave empty to save as draft)</span>
      </span>
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="w-fit rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
      />
      <input type="hidden" name="scheduled_at" value={utc} />
      <span className="text-xs text-muted">Times are in {tz}.</span>
    </label>
  );
}
