import Link from "next/link";

/*
 * One empty state for every list in the app. A small illustration of what would
 * normally be there (faded) with a solid brand-colour badge, a title, one line of
 * explanation and up to two actions. "search" is the no-results variant for
 * filters and searches that came up empty.
 */

export type EmptyKind = "posts" | "drafts" | "calendar" | "media" | "keys" | "channels" | "search";

type Action = { href: string; label: string };

const BADGE: Record<EmptyKind, { bg: string; fg: string; icon: React.ReactNode }> = {
  posts: { bg: "#2b59d9", fg: "#fff", icon: <path d="M12 5v14M5 12h14" /> },
  drafts: { bg: "#e3a72c", fg: "#202124", icon: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /> },
  calendar: { bg: "#2b59d9", fg: "#fff", icon: <path d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /> },
  media: { bg: "#d14a3e", fg: "#fff", icon: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" /> },
  keys: { bg: "#e3a72c", fg: "#202124", icon: <path d="M15 7a4 4 0 1 1-3.9 4.9L4 19v-3h3v-3h3l1.1-1.1A4 4 0 0 1 15 7Z" /> },
  channels: { bg: "#2b59d9", fg: "#fff", icon: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /> },
  search: { bg: "var(--ink)", fg: "var(--ground)", icon: <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4" /> },
};

export function EmptyState({
  kind,
  title,
  body,
  primary,
  secondary,
  compact = false,
}: {
  kind: EmptyKind;
  title: string;
  body?: React.ReactNode;
  primary?: Action;
  secondary?: Action;
  /** Tighter spacing for small panels. */
  compact?: boolean;
}) {
  const b = BADGE[kind];
  return (
    <div className={`flex flex-col items-center px-6 text-center ${compact ? "py-8" : "py-14 md:py-16"}`}>
      <div className="relative">
        <Art kind={kind} />
        <span
          className="absolute -right-3 -top-3 grid size-9 place-items-center rounded-full shadow-md ring-4 ring-surface"
          style={{ background: b.bg, color: b.fg }}
          aria-hidden
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {b.icon}
          </svg>
        </span>
      </div>
      <h2 className={`font-display font-semibold tracking-[-0.02em] text-ink ${compact ? "mt-5 text-[16px]" : "mt-6 text-[20px]"}`}>{title}</h2>
      {body ? <p className="mt-1.5 max-w-[42ch] text-[14px] leading-relaxed text-muted">{body}</p> : null}
      {primary || secondary ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
          {primary ? (
            <Link
              href={primary.href}
              className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
            >
              {primary.label}
            </Link>
          ) : null}
          {secondary ? (
            <Link href={secondary.href} className="text-[14px] font-semibold text-blue-ink hover:underline">
              {secondary.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The faded "what would be here" drawing, in the page's own line and surface colours. */
function Art({ kind }: { kind: EmptyKind }) {
  const frame = "block w-[168px] rounded-2xl border border-line bg-surface p-3 shadow-sm";
  const bar = (w: string) => <span className="block h-1.5 rounded-full bg-line" style={{ width: w }} />;

  if (kind === "calendar") {
    return (
      <span className={frame} aria-hidden>
        <span className="mb-2 block">{bar("40%")}</span>
        <span className="grid grid-cols-5 gap-1">
          {Array.from({ length: 15 }, (_, i) => (
            <span key={i} className="relative block h-5 rounded-[4px] border border-line">
              {i === 7 ? <span className="absolute inset-x-0.5 top-1 h-2 rounded-[2px] bg-[#e3a72c]" /> : null}
            </span>
          ))}
        </span>
      </span>
    );
  }
  if (kind === "media") {
    return (
      <span className={`${frame} grid grid-cols-3 gap-1.5`} aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="block aspect-square rounded-[6px] bg-surface-2" />
        ))}
      </span>
    );
  }
  if (kind === "keys") {
    return (
      <span className={`${frame} flex flex-col gap-2.5`} aria-hidden>
        {[0, 1].map((i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="block h-4 w-9 rounded-[4px] bg-surface-2" />
            {bar(i ? "45%" : "60%")}
          </span>
        ))}
      </span>
    );
  }
  if (kind === "channels") {
    return (
      <span className={`${frame} grid grid-cols-3 gap-2`} aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="grid aspect-square place-items-center rounded-[8px] border border-dashed border-line" />
        ))}
      </span>
    );
  }
  // posts, drafts, search: a few post rows with network dots in the brand colours
  const dots = kind === "posts" ? ["#2b59d9", "#e3a72c", "#d14a3e"] : [null, null, null];
  return (
    <span className={`${frame} flex flex-col gap-2.5`} aria-hidden>
      {dots.map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="block size-4 shrink-0 rounded-[5px]" style={{ background: c ?? "var(--surface-2)" }} />
          <span className="flex flex-1 flex-col gap-1">
            {bar(["80%", "65%", "72%"][i])}
            {kind === "drafts" ? null : bar(["45%", "35%", "50%"][i])}
          </span>
        </span>
      ))}
    </span>
  );
}
