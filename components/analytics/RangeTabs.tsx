"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RANGES, parseRange, type RangeKey } from "@/lib/analytics/ranges";

/** The 7 / 30 / 90 day switch, shown next to the Analytics heading. */
export function RangeTabs() {
  const current = parseRange(useSearchParams().get("range"));
  return (
    <nav className="flex items-center gap-1 rounded-full border border-line bg-surface p-1" aria-label="Date range">
      {(Object.keys(RANGES) as RangeKey[]).map((k) => (
        <Link
          key={k}
          href={`/analytics?range=${k}`}
          aria-current={k === current ? "page" : undefined}
          className={`rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
            k === current ? "bg-[#2b59d9] text-white" : "text-muted hover:text-ink"
          }`}
        >
          {RANGES[k]} days
        </Link>
      ))}
    </nav>
  );
}
