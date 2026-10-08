"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BrandTile } from "@/components/BrandTile";
import { formatInTz, localHM } from "@/lib/tz-core";
import {
  AUDIENCES,
  BLOCKS,
  DAYS,
  DAYS_SHORT,
  NETWORK_TIMES,
  hourLabel,
  levels,
  nextOccurrence,
  rankSlots,
  scoreGrid,
  type Audience,
} from "@/lib/seo/best-times";

// The same four solid steps as the Best time panel in Postbase's analytics.
const HEAT = ["var(--line)", "#2b59d9", "#e3a72c", "#d14a3e"];
const FALLBACK_TZ = "America/New_York";

/** "Tue 3pm" or "Tue 3:30pm" for an instant, in a timezone. */
function slotIn(iso: string, tz: string, long = false) {
  const { hour, minute } = localHM(iso, tz);
  const day = formatInTz(iso, tz, { weekday: long ? "long" : "short" });
  const h = hourLabel(hour);
  return `${day} ${minute ? h.replace(/(am|pm)$/, `:${String(minute).padStart(2, "0")}$1`) : h}`;
}

const tzName = (tz: string) => tz.split("/").pop()!.replace(/_/g, " ");

export function BestTimeFinder() {
  const [network, setNetwork] = useState("instagram");
  const [audience, setAudience] = useState<Audience>("everyone");
  const [tz, setTz] = useState(FALLBACK_TZ);
  // Known only in the browser; until then nothing that depends on "now" or "you" renders.
  const [mine, setMine] = useState<string | null>(null);
  const [zones, setZones] = useState<string[]>([FALLBACK_TZ]);

  useEffect(() => {
    const own = Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TZ;
    setMine(own);
    setTz(own);
    try {
      const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
      setZones([...new Set([own, ...all, FALLBACK_TZ])].sort());
    } catch {
      setZones([own, FALLBACK_TZ]);
    }
  }, []);

  const n = NETWORK_TIMES.find((x) => x.id === network)!;
  const grid = useMemo(() => scoreGrid(n, audience), [n, audience]);
  const heat = useMemo(() => levels(grid), [grid]);
  const ranked = useMemo(() => rankSlots(grid), [grid]);
  const best = ranked[0];
  const runners = ranked.slice(1, 3);
  const next = mine ? nextOccurrence(best.day, BLOCKS[best.block], tz) : null;
  const elsewhere = mine && mine !== tz;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[24px] border border-line bg-surface p-4 md:p-6">
        <div role="radiogroup" aria-label="Network" className="flex flex-wrap justify-center gap-2">
          {NETWORK_TIMES.map((x) => {
            const on = x.id === network;
            return (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setNetwork(x.id)}
                className={`inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold transition-colors ${
                  on ? "border-ink bg-ink text-ground" : "border-line bg-surface text-ink hover:border-ink"
                }`}
              >
                <BrandTile platform={x.id} size={22} radius={11} />
                {x.name}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <div>
            <span id="bt-audience" className="text-[13px] font-semibold text-ink">
              Who you post for
            </span>
            <div role="radiogroup" aria-labelledby="bt-audience" className="mt-2 grid grid-cols-3 rounded-xl bg-ground p-1">
              {AUDIENCES.map((a) => {
                const on = a.id === audience;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setAudience(a.id)}
                    className={`rounded-lg px-2 py-2 text-[13px] font-semibold transition-colors ${
                      on ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="bt-tz" className="text-[13px] font-semibold text-ink">
              Where your audience is
            </label>
            <select
              id="bt-tz"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="mt-2 h-[44px] w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                  {z === mine ? " (you)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div key={`${network}-${audience}`} className="swap-in grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col rounded-[24px] border border-line bg-surface p-5 md:p-7" aria-live="polite">
          <p className="text-[13px] font-semibold text-muted">Best time to post on {n.name}</p>
          <p className="mt-2 font-display text-[clamp(32px,5vw,44px)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
            {DAYS[best.day]}, {hourLabel(BLOCKS[best.block])}
          </p>
          <p className="mt-2 text-[14px] text-muted">
            {tzName(tz)} time
            {elsewhere && next ? (
              <>
                {" "}
                · <span className="font-semibold text-ink">{slotIn(next, mine!, true)}</span> for you
              </>
            ) : null}
          </p>

          <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-[14px]">
            {runners.map((s) => (
              <li key={`${s.day}-${s.block}`} className="flex items-center justify-between gap-3">
                <span className="text-muted">Also strong</span>
                <span className="font-semibold text-ink">
                  {DAYS_SHORT[s.day]} {hourLabel(BLOCKS[s.block])}
                </span>
              </li>
            ))}
            {next ? (
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted">Next one</span>
                <span className="font-semibold text-ink">{formatInTz(next, tz, { weekday: "short", day: "numeric", month: "short" })}</span>
              </li>
            ) : null}
          </ul>

          <p className="mt-4 text-[14px] leading-relaxed text-ink">{n.tip}</p>

          <div className="mt-auto pt-6">
            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center rounded-full bg-[#2b59d9] px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Schedule for {DAYS_SHORT[best.day]} {hourLabel(BLOCKS[best.block])}
            </Link>
            <p className="mt-2 text-center text-[12.5px] text-muted">Free for 7 days. Postbase finds your own best times as you post.</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-line bg-surface p-4 md:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-[15px] font-semibold text-ink">The whole week</h3>
            <span className="truncate text-[12px] text-muted">{tzName(tz)} time</span>
          </div>
          <div className="mt-4 grid grid-cols-[30px_repeat(9,minmax(0,1fr))] gap-1 text-[10.5px] text-muted sm:gap-1.5 sm:text-[11px]">
            <span />
            {BLOCKS.map((h) => (
              <span key={h} className="text-center">
                {hourLabel(h).replace("m", "")}
              </span>
            ))}
            {heat.map((row, d) => (
              <Row key={d} day={DAYS_SHORT[d]}>
                {row.map((lv, b) => (
                  <span
                    key={b}
                    role="img"
                    aria-label={`${DAYS[d]} ${hourLabel(BLOCKS[b])} to ${hourLabel(BLOCKS[b] + 2)}: ${["quiet", "fair", "good", "best"][lv]}`}
                    title={`${DAYS[d]} ${hourLabel(BLOCKS[b])}–${hourLabel(BLOCKS[b] + 2)}`}
                    className="h-8 rounded-md sm:h-9 sm:rounded-lg"
                    style={{ background: HEAT[lv] }}
                  />
                ))}
              </Row>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-muted">
            <span>Two-hour blocks</span>
            <span className="flex items-center gap-1">
              Quiet
              {HEAT.map((c) => (
                <span key={c} className="size-3 rounded-[3px]" style={{ background: c }} />
              ))}
              Best
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ day, children }: { day: string; children: React.ReactNode }) {
  return (
    <>
      <span className="self-center">{day}</span>
      {children}
    </>
  );
}
