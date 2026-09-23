"use client";

import { useEffect, useRef, useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { ClientLogo } from "@/components/ClientLogo";
import { useAudience, type Audience } from "@/components/marketing/Audience";
import { Fit } from "@/components/marketing/Fit";
import { useLoop } from "@/components/marketing/Mocks";

/*
 * "Who is Postbase for?" — audiences on the left (the active one is a raised
 * card with a progress line that auto-advances), and on the right a brand-colour
 * panel with a layered, animated scene of the real Postbase screens that
 * audience lives in.
 */

const CYCLE_MS = 7500;
const card = "rounded-2xl bg-surface shadow-[0_28px_60px_-26px_rgba(0,0,0,0.55)] ring-1 ring-black/5";

const BLUE = "#2b59d9";
const AMBER = "#e3a72c";
const RED = "#d14a3e";

type Persona = {
  id: string;
  title: string;
  body: string;
  color: string;
  /** Colours of the two logo-block shapes behind the scene. */
  shapes: [string, string];
  audience?: Audience;
  cta?: string;
  icon: React.ReactNode;
  panel: () => React.ReactNode;
};

const PERSONAS: Persona[] = [
  {
    id: "creators",
    title: "Creators",
    body: "Write a post once, tailor it for each network, and plan the whole week in one sitting.",
    color: BLUE,
    shapes: [AMBER, RED],
    audience: "creators",
    cta: "See it for creators",
    icon: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
    panel: () => <CreatorsScene />,
  },
  {
    id: "teams",
    title: "Agencies and teams",
    body: "A workspace per client, each with its own channels and people. Invite teammates as admins or members.",
    color: AMBER,
    shapes: [BLUE, RED],
    icon: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />,
    panel: () => <TeamsScene />,
  },
  {
    id: "developers",
    title: "Developers and agents",
    body: "Give Claude, Cursor or your own code a key, and let it schedule over MCP or the REST API.",
    color: RED,
    shapes: [AMBER, BLUE],
    audience: "developers",
    cta: "See it for developers",
    icon: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
    panel: () => <DevelopersScene />,
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
    <div
      ref={ref}
      className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14"
    >
      {/* audiences */}
      <ul className="flex flex-col gap-2">
        {PERSONAS.map((x, i) => {
          const on = i === active;
          return (
            <li
              key={x.id}
              className={`rounded-2xl border transition-[background-color,border-color,box-shadow] duration-300 ${
                on ? "border-line bg-surface shadow-[0_18px_40px_-24px_rgba(16,24,40,0.35)]" : "border-transparent"
              }`}
            >
              <button type="button" onClick={() => pick(i)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300"
                  style={{ backgroundColor: on ? x.color : "var(--surface-2)", color: on ? "#fff" : "var(--muted)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {x.icon}
                  </svg>
                </span>
                <span
                  className={`font-display text-[22px] font-semibold tracking-[-0.015em] transition-colors md:text-[25px] ${
                    on ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {x.title}
                </span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-500 ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden px-5">
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

      {/* scene */}
      <div className="relative isolate overflow-hidden rounded-[28px] transition-colors duration-500" style={{ backgroundColor: p.color }}>
        <span
          aria-hidden
          className="absolute -right-16 -top-20 -z-10 size-56 rounded-full transition-colors duration-500"
          style={{ backgroundColor: p.shapes[0] }}
        />
        <span
          aria-hidden
          className="absolute -bottom-20 -left-12 -z-10 h-44 w-64 rotate-[-14deg] rounded-[48px] transition-colors duration-500"
          style={{ backgroundColor: p.shapes[1] }}
        />
        <Fit minWidth={540} height={480}>
          <div key={p.id} className="swap-in relative h-full">
            {p.panel()}
          </div>
        </Fit>
      </div>

      <style>{`@keyframes who-progress{from{width:0%}to{width:100%}}`}</style>
    </div>
  );
}

// ── Shared scene pieces ──────────────────────────────────────────────────

function Float({
  className,
  tilt = 0,
  dur = 8,
  delay = 0,
  children,
}: {
  className: string;
  tilt?: number;
  dur?: number;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`float-y absolute ${className}`}
      style={{ "--tilt": `${tilt}deg`, "--dur": `${dur}s`, "--delay": `${-delay}s` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="swap-in inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-[12.5px] font-medium text-surface shadow-[0_20px_40px_-16px_rgba(0,0,0,0.6)]">
      <span className="flex size-4 items-center justify-center rounded-full bg-[#188038] text-[10px] font-bold text-white">✓</span>
      {children}
    </div>
  );
}

const PILL = {
  published: "bg-green/10 border-l-green",
  scheduled: "bg-blue-soft border-l-blue",
};

// ── Creators: write the X cut, schedule it, it lands on today ────────────

const X_CUT = "New on the shelf: Kochere, Ethiopia ☕️ Apricot, black tea and a little bergamot.";

function CreatorsScene() {
  const [typed, setTyped] = useState(X_CUT.length);
  const [pressed, setPressed] = useState(false);
  const [landed, setLanded] = useState(true);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setLanded(false);
    setPressed(false);
    setTyped(0);
    await step(500);
    for (let i = 1; i <= X_CUT.length; i += 2) {
      setTyped(i);
      await step(28);
    }
    setTyped(X_CUT.length);
    await step(600);
    setPressed(true);
    await step(220);
    setPressed(false);
    setLanded(true);
    await step(3000);
  });
  const chans = ["x", "linkedin", "bluesky"];
  return (
    <div ref={ref} className="absolute inset-0">
      {/* today's column */}
      <Float className="right-7 top-8 z-0" tilt={4} dur={9}>
        <div className={`${card} w-[190px] overflow-hidden`}>
          <div className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-3 py-2">
            <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted">Wed</span>
            <span className="flex size-6 items-center justify-center rounded-full bg-blue font-display text-[12px] font-semibold text-on-blue">23</span>
          </div>
          <div className="flex flex-col gap-1.5 p-2">
            <Pill status="published" time="09:00" text="This week's roasts" chans={["x", "bluesky"]} />
            {landed ? <Pill status="scheduled" time="12:00" text="New on the shelf" chans={chans} fresh /> : null}
            <Pill status="scheduled" time="14:15" text="Cupping notes" chans={["linkedin"]} />
          </div>
        </div>
      </Float>

      {/* composer */}
      <Float className="left-7 top-14 z-10" tilt={-2} dur={10} delay={2}>
        <div className={`${card} w-[340px] p-4`}>
          <p className="font-display text-[13px] font-semibold text-ink">Available channels</p>
          <div className="mt-2 flex items-center gap-2">
            {chans.map((c) => (
              <span key={c} className="rounded-full ring-2 ring-blue ring-offset-2 ring-offset-surface">
                <BrandTile platform={c} size={26} radius={13} />
              </span>
            ))}
            <span className="rounded-full opacity-45">
              <BrandTile platform="instagram" size={26} radius={13} />
            </span>
          </div>
          <p className="mt-4 font-display text-[13px] font-semibold text-ink">Customize per channel</p>
          <div className="mt-2 flex items-center gap-1 rounded-xl bg-surface-2/60 p-1">
            <span className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted">All channels</span>
            {chans.map((c, i) => (
              <span
                key={c}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${i === 0 ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
              >
                <BrandTile platform={c} size={12} radius={3} />
                {i === 0 ? "X" : c === "linkedin" ? "LinkedIn" : "Bluesky"}
                {i === 0 && typed > 0 ? <span className="size-1.5 rounded-full bg-blue" /> : null}
              </span>
            ))}
          </div>
          <div className="mt-2.5 rounded-xl border border-line bg-ground p-3">
            <p className="min-h-[60px] text-[13px] leading-relaxed text-ink">
              {X_CUT.slice(0, typed)}
              {typed < X_CUT.length ? <span className="ml-px inline-block h-[1em] w-px translate-y-[2px] animate-pulse bg-ink" /> : null}
            </p>
            <div className="mt-1.5 text-[11px] tabular-nums text-muted">{typed} / 280</div>
          </div>
        </div>
      </Float>

      {/* schedule bar */}
      <Float className="bottom-20 right-8 z-20" tilt={2} dur={8} delay={1}>
        <div className={`${card} flex items-center gap-2 px-3 py-2.5`}>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ground px-2.5 py-1.5 text-[12px] text-ink">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Wed 23 Sep, 12:00
          </span>
          <span className={`rounded-full bg-blue px-3.5 py-1.5 font-display text-[12px] font-semibold text-on-blue transition-transform ${pressed ? "scale-90" : ""}`}>
            Schedule
          </span>
        </div>
      </Float>

      <div className="absolute bottom-7 left-8 z-30 min-h-9">{landed ? <Toast>Scheduled for Wed 23 Sep, 12:00</Toast> : null}</div>
    </div>
  );
}

function Pill({
  status,
  time,
  text,
  chans,
  fresh = false,
}: {
  status: keyof typeof PILL;
  time: string;
  text: string;
  chans: string[];
  fresh?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border border-l-[3px] border-line px-1.5 py-1 text-[10.5px] text-ink ${PILL[status]} ${
        fresh ? "swap-in" : ""
      }`}
    >
      <span className="flex shrink-0 -space-x-1">
        {chans.map((c) => (
          <span key={c} className="rounded-[3px] ring-1 ring-surface">
            <BrandTile platform={c} size={11} radius={3} />
          </span>
        ))}
      </span>
      <span className="tabular-nums text-muted">{time}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

// ── Teams: invite a teammate, switch workspace ───────────────────────────

const INVITE = "lee@crumbandco.com";

function TeamsScene() {
  const [ws, setWs] = useState(1);
  const [email, setEmail] = useState(INVITE.length);
  const [pressed, setPressed] = useState(false);
  const [invited, setInvited] = useState(true);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setWs(0);
    setInvited(false);
    setPressed(false);
    setEmail(0);
    await step(900);
    setWs(1);
    await step(900);
    for (let i = 1; i <= INVITE.length; i++) {
      setEmail(i);
      await step(45);
    }
    await step(400);
    setPressed(true);
    await step(220);
    setPressed(false);
    setInvited(true);
    await step(3000);
  });
  const orgs: [string, string][] = [
    ["Halden Coffee", "Owner"],
    ["Crumb & Co.", "Admin"],
    ["Tom Reyes", "Member"],
  ];
  const members: [string, string][] = [
    ["maya@crumbandco.com", "Owner"],
    ["sam@crumbandco.com", "Admin"],
  ];
  return (
    <div ref={ref} className="absolute inset-0">
      {/* workspace switcher, open */}
      <Float className="left-7 top-8 z-10" tilt={-3} dur={9}>
        <div className={`${card} w-[230px] overflow-hidden`}>
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <div className="text-[10.5px] font-medium uppercase tracking-wide text-muted">Workspace</div>
              <div key={ws} className="swap-in truncate text-[14px] font-semibold text-ink">{orgs[ws][0]}</div>
            </div>
            <span className="ml-auto text-xs text-muted">▾</span>
          </div>
          <div className="flex flex-col gap-0.5 p-2">
            {orgs.map(([name, role], i) => (
              <span
                key={name}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors duration-300 ${
                  i === ws ? "bg-blue-soft font-semibold text-blue-ink" : "text-ink"
                }`}
              >
                {name}
                <span className="ml-auto text-[11px] font-normal text-muted">{role}</span>
              </span>
            ))}
          </div>
        </div>
      </Float>

      {/* members + pending invites */}
      <Float className="right-7 top-16 z-0" tilt={3} dur={10} delay={2}>
        <div className={`${card} w-[260px] overflow-hidden`}>
          <div className="border-b border-line px-4 py-2.5 font-display text-[13px] font-semibold text-ink">Members</div>
          {members.map(([e, role]) => (
            <div key={e} className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <span className="truncate text-[12px] font-medium text-ink">{e}</span>
              <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[10.5px] font-medium text-muted">{role}</span>
            </div>
          ))}
          <div className="px-4 pb-1 pt-2.5 font-display text-[12px] font-semibold text-ink">Pending invites</div>
          {invited ? (
            <div className="swap-in px-4 pb-3">
              <div className="flex items-center gap-2 py-1">
                <span className="truncate text-[12px] text-ink">{INVITE}</span>
                <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[10.5px] font-medium text-muted">Member</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-line bg-ground py-1 pl-2 pr-1">
                <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-muted">postbase.so/invite/k7Qm2x…</span>
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold text-ink ring-1 ring-line">Copy</span>
              </div>
            </div>
          ) : (
            <p className="px-4 pb-3 text-[11.5px] text-muted">No pending invites.</p>
          )}
        </div>
      </Float>

      {/* invite form */}
      <Float className="bottom-10 left-9 z-20" tilt={-1} dur={8} delay={1}>
        <div className={`${card} w-[360px] p-3.5`}>
          <div className="mb-2 font-display text-[12.5px] font-semibold text-ink">Invite a teammate</div>
          <div className="flex items-end gap-2">
            <span
              className={`flex-1 truncate rounded-lg border bg-ground px-2.5 py-1.5 text-[12px] ${
                email ? "border-blue text-ink" : "border-line text-muted/80"
              }`}
            >
              {email ? INVITE.slice(0, email) : "teammate@company.com"}
            </span>
            <span className="rounded-lg border border-line bg-ground px-2 py-1.5 text-[12px] text-ink">Member ▾</span>
            <span
              className={`rounded-full bg-blue px-3 py-1.5 font-display text-[12px] font-semibold text-on-blue transition-transform ${
                pressed ? "scale-90" : ""
              }`}
            >
              Create invite
            </span>
          </div>
        </div>
      </Float>
    </div>
  );
}

// ── Developers: pick a client, Claude connects ───────────────────────────

const MCP_URL = "https://www.postbase.so/api/mcp";
const DEV_CLIENTS: { id: string; name: string; code: string }[] = [
  { id: "claude", name: "Claude Desktop", code: MCP_URL },
  { id: "cursor", name: "Cursor", code: MCP_URL },
  { id: "claude-code", name: "Claude Code", code: "claude mcp add --transport http postbase …" },
];

function DevelopersScene() {
  const [client, setClient] = useState(0);
  const [connected, setConnected] = useState(true);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setConnected(false);
    for (let i = 0; i < DEV_CLIENTS.length; i++) {
      setClient(i);
      await step(1300);
    }
    setClient(0);
    await step(600);
    setConnected(true);
    await step(2800);
  });
  const c = DEV_CLIENTS[client];
  return (
    <div ref={ref} className="absolute inset-0">
      {/* API key */}
      <Float className="right-7 top-7 z-20" tilt={3} dur={9}>
        <div className={`${card} w-[240px] p-3`}>
          <div className="mb-2 font-display text-[12.5px] font-semibold text-ink">API keys</div>
          <div className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-ink">Claude on my laptop</div>
              <code className="font-mono text-[10.5px] text-muted">pb_live_…4f2a</code>
            </div>
            <span className="ml-auto text-[11px] font-semibold text-muted">Rotate</span>
          </div>
        </div>
      </Float>

      {/* MCP client picker */}
      <Float className="left-7 top-[104px] z-10" tilt={-2} dur={10} delay={2}>
        <div className={`${card} w-[340px] p-4`}>
          <div className="font-display text-[13px] font-semibold text-ink">MCP client configuration</div>
          <p className="mb-1.5 mt-3 text-[11px] font-semibold text-muted">Client</p>
          <div className="flex flex-wrap gap-1.5">
            {DEV_CLIENTS.map((x, i) => (
              <span
                key={x.id}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11.5px] font-semibold transition-colors duration-300 ${
                  i === client ? "border-blue bg-blue-soft text-blue-ink" : "border-line text-ink"
                }`}
              >
                <ClientLogo id={x.id} size={20} />
                {x.name}
              </span>
            ))}
          </div>
          <div key={client} className="swap-in mt-3 overflow-hidden rounded-xl bg-[#12141a] ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{c.id === "claude-code" ? "bash" : "url"}</span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10.5px] font-semibold text-white">Copy</span>
            </div>
            <pre className="overflow-hidden px-3 py-2.5 font-mono text-[11px] text-[#e6e8ef]">{c.code}</pre>
          </div>
        </div>
      </Float>

      {/* connected apps */}
      <Float className="bottom-9 right-8 z-20" tilt={2} dur={8} delay={1}>
        <div className={`${card} w-[280px] overflow-hidden`}>
          <div className="border-b border-line px-4 py-2.5 font-display text-[13px] font-semibold text-ink">Connected apps</div>
          {(connected ? ["Claude", "Cursor"] : ["Cursor"]).map((name) => (
            <div
              key={name}
              className={`flex items-center gap-2.5 px-4 py-2.5 ${name === "Claude" ? "swap-in border-b border-line" : ""}`}
            >
              <ClientLogo id={name === "Claude" ? "claude" : "cursor"} size={28} />
              <div className="min-w-0 leading-tight">
                <div className="text-[12.5px] font-semibold text-ink">{name}</div>
                <div className="truncate text-[10.5px] text-muted">
                  Halden Coffee · {name === "Claude" ? "connected just now" : "connected 14 Sep 2026"}
                </div>
              </div>
              <span className="ml-auto text-[11px] font-semibold text-muted">Revoke</span>
            </div>
          ))}
        </div>
      </Float>

      <div className="absolute bottom-7 left-8 z-30 min-h-9">{connected ? <Toast>Claude connected to Halden Coffee</Toast> : null}</div>
    </div>
  );
}
