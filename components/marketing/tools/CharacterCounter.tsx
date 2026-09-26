"use client";

import { useMemo, useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { LIMITS, count, splitThread, type CountRule } from "@/lib/char-count";

const SAMPLE =
  "New on the shelf: Kochere, Ethiopia ☕️\n\nWashed process, light roast. In the cup it's apricot, black tea and a little bergamot.\n\nRoasted Monday, shipped Tuesday. 40 bags this week: https://haldencoffee.com/kochere";

const THREAD_NETWORKS = LIMITS.filter((l) => ["x", "bluesky", "threads", "mastodon"].includes(l.id));

function tone(n: number, limit: number) {
  if (n > limit) return { bar: "#d14a3e", text: "text-[#d14a3e]" };
  if (n >= limit * 0.9) return { bar: "#e3a72c", text: "text-ink" };
  return { bar: "#2b59d9", text: "text-ink" };
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked; the text is selectable */
        }
      }}
      className={`shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors ${
        done ? "bg-[#188038] text-white" : "bg-surface text-ink ring-1 ring-line hover:ring-ink"
      }`}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

/** Live per-network counts, plus a thread splitter for the short-form networks. */
export function CharacterCounter() {
  const [text, setText] = useState(SAMPLE);
  const [threadNet, setThreadNet] = useState("x");
  const [numbered, setNumbered] = useState(true);

  const counts = useMemo(() => LIMITS.map((l) => ({ ...l, n: count(text, l.rule) })), [text]);
  const tn = THREAD_NETWORKS.find((l) => l.id === threadNet)!;
  const posts = useMemo(() => splitThread(text, tn.limit, tn.rule as CountRule, numbered), [text, tn, numbered]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-line bg-surface p-5 md:p-6">
          <label htmlFor="cc-text" className="font-display text-[15px] font-semibold text-ink">
            Your post
          </label>
          <textarea
            id="cc-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="mt-3 w-full resize-y rounded-xl border border-line bg-ground p-4 text-[16px] leading-relaxed text-ink outline-none focus:border-blue"
            placeholder="Type or paste your post…"
          />
          <div className="mt-2 flex items-center justify-between text-[13px] text-muted">
            <span>
              {Array.from(text).length.toLocaleString()} characters · {text.trim() ? text.trim().split(/\s+/).length : 0} words
            </span>
            <button type="button" onClick={() => setText("")} className="font-semibold text-blue-ink">
              Clear
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-line bg-surface p-5 md:p-6">
          <p className="font-display text-[15px] font-semibold text-ink">Fits on</p>
          <ul className="mt-4 flex flex-col gap-3.5">
            {counts.map((c) => {
              const t = tone(c.n, c.limit);
              return (
                <li key={c.id}>
                  <div className="flex items-center gap-2.5">
                    <BrandTile platform={c.id} size={22} radius={6} />
                    <span className="text-[14px] font-semibold text-ink">{c.name}</span>
                    <span className="text-[12px] text-muted">{c.what}</span>
                    <span className={`ml-auto text-[13px] font-semibold tabular-nums ${t.text}`}>
                      {c.n.toLocaleString()} / {c.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full transition-[width] duration-200"
                      style={{ width: `${Math.min(100, (c.n / c.limit) * 100)}%`, backgroundColor: t.bar }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="rounded-[24px] border border-line bg-surface p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-[15px] font-semibold text-ink">Split into a thread for</p>
          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-ground p-1">
            {THREAD_NETWORKS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setThreadNet(l.id)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  threadNet === l.id ? "bg-blue text-on-blue" : "text-muted hover:text-ink"
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-muted">
            <input type="checkbox" checked={numbered} onChange={(e) => setNumbered(e.target.checked)} className="size-4 accent-[#2b59d9]" />
            Number the posts (1/3)
          </label>
        </div>

        {posts.length === 0 ? (
          <p className="mt-5 text-[14px] text-muted">Type something above to split it.</p>
        ) : (
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {posts.map((p, i) => {
              const n = count(p, tn.rule as CountRule);
              return (
                <li key={i} className="flex flex-col rounded-xl border border-line bg-ground p-4">
                  <div className="flex items-center gap-2">
                    <BrandTile platform={tn.id} size={18} radius={5} />
                    <span className="text-[12px] font-semibold text-muted">Post {i + 1}</span>
                    <span className={`ml-auto text-[12px] font-semibold tabular-nums ${tone(n, tn.limit).text}`}>
                      {n} / {tn.limit}
                    </span>
                    <CopyButton text={p} />
                  </div>
                  <p className="mt-2.5 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">{p}</p>
                </li>
              );
            })}
          </ol>
        )}
        {posts.length > 1 ? (
          <p className="mt-4 text-[13px] text-muted">
            Want this to post itself? Paste it into the Postbase composer as a thread and schedule it.{" "}
            <a href="/login" className="font-semibold text-blue-ink underline underline-offset-2">
              Try it free
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
