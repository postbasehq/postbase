import type { ChangeType } from "@/lib/changelog";

/* Solid brand colour per change type, shared by the changelog list and entry pages (server and client). */

export const TYPE = {
  new: { label: "New", bg: "#2b59d9", ink: "#ffffff", mark: "#2148b3" },
  improved: { label: "Improved", bg: "#e3a72c", ink: "#14161a", mark: "#c98e17" },
  fixed: { label: "Fixed", bg: "#d14a3e", ink: "#ffffff", mark: "#b23a2f" },
} as const;

export function TypePill({ type }: { type: ChangeType }) {
  const t = TYPE[type];
  return (
    <span className="inline-block shrink-0 rounded-full px-2.5 py-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ background: t.bg, color: t.ink }}>
      {t.label}
    </span>
  );
}
