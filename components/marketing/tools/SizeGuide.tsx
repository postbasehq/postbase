"use client";

import { useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import type { NetworkSpecs, Spec } from "@/lib/seo/specs";

/** A small rectangle drawn at the spec's aspect ratio. */
function Ratio({ ratio }: { ratio?: [number, number] }) {
  if (!ratio) return <span className="size-9 shrink-0" aria-hidden />;
  const [w, h] = ratio;
  const max = 36;
  const width = w >= h ? max : Math.round((max * w) / h);
  const height = h >= w ? max : Math.round((max * h) / w);
  return (
    <span className="grid size-9 shrink-0 place-items-center" aria-hidden>
      <span className="rounded-[4px] bg-[#2b59d9]" style={{ width, height }} />
    </span>
  );
}

function SpecRows({ title, rows }: { title: string; rows: Spec[] }) {
  if (!rows.length) return null;
  return (
    <div className="rounded-[20px] border border-line bg-surface p-5">
      <h3 className="font-display text-[16px] font-semibold text-ink">{title}</h3>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 py-3">
            <Ratio ratio={r.ratio} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-ink">{r.label}</div>
              {r.note ? <div className="mt-0.5 text-[12.5px] text-muted">{r.note}</div> : null}
            </div>
            <div className="shrink-0 text-right font-mono text-[13px] font-semibold text-ink">{r.size}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SizeGuide({ networks }: { networks: NetworkSpecs[] }) {
  const [active, setActive] = useState(networks[0]?.id ?? "");
  const n = networks.find((x) => x.id === active) ?? networks[0];

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Network" className="flex flex-wrap justify-center gap-2">
        {networks.map((x) => {
          const on = x.id === active;
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(x.id)}
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

      {n ? (
        <div key={n.id} className="swap-in flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SpecRows title="Images" rows={n.images} />
            <SpecRows title="Video" rows={n.video} />
          </div>
          {n.limits.length ? (
            <div className="rounded-[20px] border border-line bg-surface p-5">
              <h3 className="font-display text-[16px] font-semibold text-ink">Limits</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {n.limits.map((l) => (
                  <li key={l} className="flex items-start gap-2.5 text-[14px] text-ink">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#e3a72c]" aria-hidden />
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {n.sources.length ? (
            <p className="text-center text-[12.5px] text-muted">
              From {n.name}&apos;s own guidance
              {n.sources.map((s, i) => (
                <span key={s.url}>
                  {i === 0 ? ": " : ", "}
                  <a href={s.url} target="_blank" rel="nofollow noopener" className="underline decoration-line underline-offset-2 hover:text-ink">
                    {s.label}
                  </a>
                </span>
              ))}
              . Checked September 2026.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
