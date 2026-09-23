"use client";

import { useEffect, useRef, useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { useAudience, type Audience } from "@/components/marketing/Audience";
import { Fit } from "@/components/marketing/Fit";

/*
 * "Who is Postbase for?" — a list of audiences on the left that auto-advances
 * (with a progress line), and on the right a brand-colour panel showing the
 * real Postbase screens each audience lives in.
 */

const CYCLE_MS = 6000;
const card = "rounded-2xl bg-surface shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]";

type Persona = {
  id: string;
  title: string;
  body: string;
  color: string;
  audience?: Audience;
  cta?: string;
  icon: React.ReactNode;
  panel: React.ReactNode;
};

const PERSONAS: Persona[] = [
  {
    id: "creators",
    title: "Creators",
    body: "Write a post once, tailor it for each network, and plan the whole week in one sitting.",
    color: "#2b59d9",
    audience: "creators",
    cta: "See it for creators",
    icon: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
    panel: <CreatorsPanel />,
  },
  {
    id: "teams",
    title: "Agencies and teams",
    body: "A workspace per client, each with its own channels and people. Invite teammates as admins or members.",
    color: "#e3a72c",
    icon: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />,
    panel: <TeamsPanel />,
  },
  {
    id: "developers",
    title: "Developers and agents",
    body: "Give Claude, Cursor or your own code a key, and let it schedule over MCP or the REST API.",
    color: "#d14a3e",
    audience: "developers",
    cta: "See it for developers",
    icon: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
    panel: <DevelopersPanel />,
  },
];

export function WhoFor() {
  const { setAudience } = useAudience();
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [cycle, setCycle] = useState(0); // bumps to restart the progress line
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % PERSONAS.length), CYCLE_MS);
    return () => clearTimeout(t);
  }, [inView, active, cycle]);

  const pick = (i: number) => {
    setActive(i);
    setCycle((c) => c + 1);
  };
  const p = PERSONAS[active];

  return (
    <div ref={ref} className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
      {/* audiences */}
      <ul className="flex flex-col">
        {PERSONAS.map((x, i) => {
          const on = i === active;
          return (
            <li key={x.id} className="border-b border-line last:border-b-0">
              <button type="button" onClick={() => pick(i)} className="flex w-full items-center gap-4 py-5 text-left">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300"
                  style={{ backgroundColor: on ? x.color : "var(--surface-2)", color: on ? "#fff" : "var(--muted)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {x.icon}
                  </svg>
                </span>
                <span
                  className={`font-display text-[22px] font-semibold tracking-[-0.015em] transition-colors md:text-[26px] ${
                    on ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {x.title}
                </span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-500 ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <p className="max-w-[46ch] pl-[60px] text-[15.5px] leading-relaxed text-muted">{x.body}</p>
                  {x.audience ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAudience(x.audience!);
                        document.getElementById("product")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`ml-[60px] mt-3 text-[14px] font-semibold hover:underline ${
                        x.audience === "developers" ? "text-terra" : "text-blue-ink"
                      }`}
                    >
                      {x.cta} →
                    </button>
                  ) : null}
                  <div className="mb-5 ml-[60px] mt-4 h-[3px] overflow-hidden rounded-full bg-surface-2">
                    {on ? (
                      <div
                        key={`${active}-${cycle}-${inView}`}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: x.color,
                          animation: inView ? `who-progress ${CYCLE_MS}ms linear forwards` : undefined,
                          width: inView ? undefined : "0%",
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* product panel */}
      <div className="overflow-hidden rounded-[28px] transition-colors duration-500" style={{ backgroundColor: p.color }}>
        <Fit minWidth={540} height={480}>
          <div key={p.id} className="swap-in flex h-full items-center justify-center p-10">
            {p.panel}
          </div>
        </Fit>
      </div>

      <style>{`@keyframes who-progress{from{width:0%}to{width:100%}}`}</style>
    </div>
  );
}

// ── Panels (pieces of the real app) ──────────────────────────────────────

function CreatorsPanel() {
  const chans = ["x", "linkedin", "bluesky"];
  return (
    <div className="relative w-full max-w-[460px]">
      <div className={`${card} p-5`}>
        <p className="font-display text-[14px] font-semibold text-ink">Available channels</p>
        <div className="mt-3 flex items-center gap-2.5">
          {chans.map((c) => (
            <span key={c} className="rounded-full ring-2 ring-blue ring-offset-2 ring-offset-surface">
              <BrandTile platform={c} size={30} radius={15} />
            </span>
          ))}
          {["instagram", "tiktok"].map((c) => (
            <span key={c} className="rounded-full opacity-45">
              <BrandTile platform={c} size={30} radius={15} />
            </span>
          ))}
        </div>
        <p className="mt-5 font-display text-[14px] font-semibold text-ink">Customize per channel</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1 rounded-xl bg-surface-2/60 p-1">
          <span className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted">All channels</span>
          {chans.map((c, i) => (
            <span
              key={c}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                i === 0 ? "bg-surface text-ink shadow-sm" : "text-muted"
              }`}
            >
              <BrandTile platform={c} size={14} radius={4} />
              @haldencoffee
              {i < 2 ? <span className="size-1.5 rounded-full bg-blue" /> : null}
            </span>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-line bg-ground p-3">
          <div className="h-2 w-[92%] rounded-full bg-line" />
          <div className="mt-2 h-2 w-[70%] rounded-full bg-line" />
          <div className="mt-3 flex items-center gap-3 text-[11.5px]">
            <span className="tabular-nums text-muted">105 / 280</span>
            <span className="font-medium text-blue-ink">Copy base text</span>
          </div>
        </div>
      </div>
      <div className={`${card} absolute -bottom-10 -right-4 flex items-center gap-2 px-3.5 py-2.5 md:-right-8`}>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ground px-2.5 py-1.5 text-[12px] text-ink">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Wed 23 Sep, 12:00
        </span>
        <span className="rounded-full bg-blue px-3.5 py-1.5 font-display text-[12px] font-semibold text-on-blue">Schedule</span>
      </div>
    </div>
  );
}

function TeamsPanel() {
  const orgs: [string, string, boolean][] = [
    ["Halden Coffee", "Owner", true],
    ["Crumb & Co.", "Admin", false],
    ["Tom Reyes", "Member", false],
  ];
  const members: [string, string][] = [
    ["maya@haldencoffee.com", "Owner"],
    ["sam@haldencoffee.com", "Admin"],
    ["lee@haldencoffee.com", "Member"],
  ];
  return (
    <div className="relative h-[340px] w-full max-w-[470px]">
      {/* workspace switcher, open */}
      <div className={`${card} absolute left-0 top-0 z-10 w-[230px] overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10.5px] font-medium uppercase tracking-wide text-muted">Workspace</div>
            <div className="truncate text-[13.5px] font-semibold text-ink">Halden Coffee</div>
          </div>
          <span className="ml-auto text-xs text-muted">▾</span>
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          {orgs.map(([name, role, on]) => (
            <span
              key={name}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] ${on ? "bg-blue-soft font-semibold text-blue-ink" : "text-ink"}`}
            >
              {name}
              <span className="ml-auto text-[11px] font-normal text-muted">{role}</span>
            </span>
          ))}
        </div>
      </div>

      {/* members */}
      <div className={`${card} absolute right-0 top-[64px] w-[250px] overflow-hidden`}>
        <div className="border-b border-line px-4 py-3 font-display text-[13px] font-semibold text-ink">Members</div>
        {members.map(([email, role], i) => (
          <div key={email} className={`flex items-center gap-3 px-4 py-2.5 ${i < members.length - 1 ? "border-b border-line" : ""}`}>
            <span className="truncate text-[12.5px] font-medium text-ink">
              {email}
              {i === 0 ? <span className="ml-1.5 text-[11px] text-muted">(you)</span> : null}
            </span>
            <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">{role}</span>
          </div>
        ))}
      </div>

      {/* invite */}
      <div className={`${card} absolute bottom-0 left-4 z-20 flex w-[340px] items-end gap-2 p-3.5`}>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium text-muted">Email</span>
          <span className="rounded-lg border border-line bg-ground px-2.5 py-1.5 text-[12px] text-muted/80">teammate@company.com</span>
        </label>
        <span className="rounded-lg border border-line bg-ground px-2 py-1.5 text-[12px] text-ink">Member ▾</span>
        <span className="rounded-full bg-blue px-3 py-1.5 font-display text-[12px] font-semibold text-on-blue">Create invite</span>
      </div>
    </div>
  );
}

function DevelopersPanel() {
  return (
    <div className="relative w-full max-w-[460px]">
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-line px-5 py-3.5">
          <div className="font-display text-[14px] font-semibold text-ink">API keys</div>
          <p className="mt-0.5 text-[12px] text-muted">A key authenticates the MCP server, the REST API, and the CLI.</p>
        </div>
        {[
          ["Claude on my laptop", "pb_live_…4f2a", "Created 23 Sep 2026 · last used today"],
          ["Zapier workflow", "pb_live_…9c1e", "Created 02 Sep 2026 · last used 22 Sep 2026"],
        ].map(([label, hint, sub], i) => (
          <div key={label} className={`flex items-center gap-3 px-5 py-3 ${i === 0 ? "border-b border-line" : ""}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">{label}</span>
                <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">{hint}</code>
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted">{sub}</div>
            </div>
            <span className="ml-auto text-[11.5px] font-semibold text-muted">Rotate</span>
          </div>
        ))}
      </div>
      <div className={`${card} absolute -bottom-20 -right-2 w-[300px] overflow-hidden md:-right-8`}>
        <div className="border-b border-line px-4 py-2.5 font-display text-[13px] font-semibold text-ink">Connected apps</div>
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-surface-2 text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-[12.5px] font-semibold text-ink">Claude</div>
            <div className="truncate text-[10.5px] text-muted">Halden Coffee · connected 23 Sep 2026</div>
          </div>
          <span className="ml-auto text-[11px] font-semibold text-muted">Revoke</span>
        </div>
      </div>
    </div>
  );
}
