"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LogoMark } from "@/components/marketing/Decor";
import { ChangelogDemo } from "@/components/marketing/changelog/ChangelogDemo";
import type { ChangeType, Entry, Week } from "@/lib/changelog";
import { TYPE, TypePill } from "@/components/marketing/changelog/types";

/*
 * The changelog, interactive: the three type tiles are also the type filter,
 * area chips narrow it further, the week list on the left follows the scroll
 * and jumps to a week, and each entry opens in place (with a link to its own
 * page). Each week's headline entry sits on a solid brand tile with a slice of
 * the real product.
 */

const weekId = (monday: string) => `week-${monday}`;

/** A week's lead entry: solid tile in its type's colour, copy left, product slice bleeding off the right. */
function Headline({ e }: { e: Entry }) {
  const t = TYPE[e.type];
  return (
    <Link
      href={`/changelog/${e.slug}`}
      className="group relative isolate grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[24px] md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
      style={{ background: t.bg }}
    >
      <LogoMark color={t.mark} edge="top" className="pointer-events-none absolute left-[34%] top-0 -z-10 hidden w-[96px] md:block" />
      <div className="flex flex-col p-7 md:p-9">
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-[#14161a]">{t.label}</span>
          <span className="text-[13px] font-medium" style={{ color: t.ink }}>
            {e.area}
          </span>
        </span>
        <h3 className="mt-5 font-display text-[clamp(26px,2.6vw,34px)] font-semibold leading-[1.1] tracking-[-0.02em]" style={{ color: t.ink }}>
          {e.title}
        </h3>
        <p className="mt-3 max-w-[42ch] text-[16px] leading-relaxed" style={{ color: t.ink }}>
          {e.summary}
        </p>
        <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold underline-offset-4 group-hover:underline" style={{ color: t.ink }}>
          Read more <span aria-hidden>→</span>
        </span>
      </div>
      {e.demo ? (
        <div className="relative min-h-[260px] overflow-hidden md:min-h-0">
          <div className="absolute left-6 top-6 origin-top-left max-md:[zoom:0.7] md:left-2 md:top-9">
            <ChangelogDemo demo={e.demo} />
          </div>
        </div>
      ) : null}
    </Link>
  );
}

/** One entry as a row that opens in place. */
function Row({ e, open, onToggle }: { e: Entry; open: boolean; onToggle: () => void }) {
  return (
    <li className="border-b border-line last:border-b-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-surface-2">
        <TypePill type={e.type} />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[16px] font-semibold leading-snug text-ink">{e.title}</span>
          <span className="mt-0.5 block text-[14px] leading-snug text-muted">{e.summary}</span>
        </span>
        <span className="mt-0.5 hidden shrink-0 rounded-full border border-line px-2.5 py-0.5 text-[12px] font-medium text-muted sm:inline">{e.area}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`mt-1 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="swap-in px-4 pb-5 pl-[4.25rem]">
          <div className="prose-blog max-w-[64ch] text-[15px]" dangerouslySetInnerHTML={{ __html: e.html }} />
          <Link href={`/changelog/${e.slug}`} className="mt-1 inline-flex items-center gap-1.5 text-[14px] font-semibold text-blue-ink hover:underline">
            Link to this change <span aria-hidden>→</span>
          </Link>
        </div>
      ) : null}
    </li>
  );
}

export function ChangelogBrowser({ weeks }: { weeks: Week[] }) {
  const all = useMemo(() => weeks.flatMap((w) => w.entries), [weeks]);
  const [type, setType] = useState<ChangeType | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(weeks[0]?.monday ?? "");

  const areas = useMemo(() => [...new Set(all.map((e) => e.area))].sort(), [all]);
  const counts = useMemo(() => {
    const c: Record<ChangeType, number> = { new: 0, improved: 0, fixed: 0 };
    for (const e of all) if (!area || e.area === area) c[e.type]++;
    return c;
  }, [all, area]);
  const shown = (e: Entry) => (!type || e.type === type) && (!area || e.area === area);
  const visible = weeks.map((w) => ({ ...w, entries: w.entries.filter(shown) })).filter((w) => w.entries.length > 0);

  // The week list follows the scroll.
  useEffect(() => {
    const els = visible.map((w) => document.getElementById(weekId(w.monday))).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (items) => {
        const top = items.filter((i) => i.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id.replace("week-", ""));
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visible.map((w) => w.monday).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (slug: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });

  return (
    <div>
      {/* The type tiles are the type filter */}
      <div className="grid grid-cols-3 gap-3 md:gap-5">
        {(Object.keys(TYPE) as ChangeType[]).map((k) => {
          const t = TYPE[k];
          const on = type === k;
          // While another type is picked, this one turns to an outline tile (solid, never faded).
          const muted = !!type && !on;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setType(on ? null : k)}
              aria-pressed={on}
              className={`relative isolate overflow-hidden rounded-[20px] border-2 p-4 text-left transition-transform active:scale-[0.98] md:rounded-[24px] md:p-7 ${
                muted ? "border-line bg-surface" : "border-transparent"
              } ${on ? "ring-4 ring-ink ring-offset-2 ring-offset-ground" : ""}`}
              style={muted ? undefined : { background: t.bg }}
            >
              <LogoMark color={muted ? t.bg : t.mark} edge="top" className="pointer-events-none absolute right-4 top-0 -z-10 w-[56px] md:right-6 md:w-[84px]" />
              <span className="block font-display text-[clamp(30px,5vw,56px)] font-semibold leading-none tracking-[-0.03em]" style={{ color: muted ? t.bg : t.ink }}>
                {counts[k]}
              </span>
              <span className={`mt-2 block font-display text-[14px] font-semibold md:text-[17px] ${muted ? "text-ink" : ""}`} style={muted ? undefined : { color: t.ink }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Area chips */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setArea(null)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${!area ? "bg-ink text-ground" : "border border-line text-ink hover:border-ink"}`}
        >
          Everything
        </button>
        {areas.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setArea(area === a ? null : a)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${area === a ? "bg-ink text-ground" : "border border-line text-ink hover:border-ink"}`}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Week list, follows the scroll */}
        <nav aria-label="Weeks" className="hidden lg:block">
          <ol className="sticky top-28 flex flex-col gap-1 border-l border-line">
            {visible.map((w) => (
              <li key={w.monday}>
                <a
                  href={`#${weekId(w.monday)}`}
                  className={`-ml-px flex items-baseline justify-between gap-2 border-l-2 py-1.5 pl-4 pr-1 text-[13px] transition-colors ${
                    active === w.monday ? "border-[#2b59d9] font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {w.label.replace("Week of ", "")}
                  <span className="text-[12px] tabular-nums text-muted">{w.entries.length}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-16">
          {visible.length === 0 ? (
            <div className="rounded-[22px] border border-line bg-surface p-2">
              <div className="rounded-2xl border border-line bg-surface-2 p-8 text-center">
                <p className="font-display text-[18px] font-semibold text-ink">Nothing matches both filters yet</p>
                <button
                  type="button"
                  onClick={() => {
                    setType(null);
                    setArea(null);
                  }}
                  className="mt-3 text-[14px] font-semibold text-blue-ink hover:underline"
                >
                  Show everything
                </button>
              </div>
            </div>
          ) : null}
          {visible.map((w) => {
            const lead = w.entries.find((e) => e.headline);
            const rest = w.entries.filter((e) => e !== lead);
            return (
              <section key={w.monday} id={weekId(w.monday)} className="scroll-mt-28">
                <div className="mb-5 flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-[clamp(22px,2.4vw,28px)] font-semibold tracking-[-0.02em] text-ink">{w.label}</h2>
                  <span className="text-[13px] text-muted">
                    {w.entries.length} {w.entries.length === 1 ? "change" : "changes"}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {lead ? <Headline e={lead} /> : null}
                  {rest.length ? (
                    <div className="rounded-[22px] border border-line bg-surface p-2 shadow-sm">
                      <ul className="rounded-2xl border border-line bg-surface">
                        {rest.map((e) => (
                          <Row key={e.slug} e={e} open={open.has(e.slug)} onToggle={() => toggle(e.slug)} />
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
