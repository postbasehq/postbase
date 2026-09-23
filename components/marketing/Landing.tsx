"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { AudienceProvider, AudienceToggle, Swap, useAudience, type Audience } from "@/components/marketing/Audience";
import { AgentChatDemo } from "@/components/marketing/AgentChatDemo";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { ComposerShot } from "@/components/marketing/ComposerShot";
import { CtaDecor, HeroDecor } from "@/components/marketing/Decor";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { AgentMock, AnalyticsMock, DeliveryMock, MediaMock, WorkspacesMock } from "@/components/marketing/Mocks";

const NETWORKS = ["x", "linkedin", "instagram", "tiktok", "youtube", "bluesky", "mastodon"];
const MCP_URL = "https://www.postbase.so/api/mcp";

export function Landing() {
  return (
    <AudienceProvider>
      <SiteNav center={<NavToggle />} />
      <main>
        <Hero />
        <WhoFor />
        <AudienceSections />
        <Features />
        <Channels />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </AudienceProvider>
  );
}

/** Compact switch in the nav, shown once the hero's switch scrolls away. */
function NavToggle() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById("hero-toggle");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { rootMargin: "-110px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      inert={!show}
      className={`transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
        show ? "opacity-100" : "pointer-events-none -translate-y-1.5 opacity-0"
      }`}
    >
      <AudienceToggle compact />
    </div>
  );
}

// ── Shared pieces ────────────────────────────────────────────────────────

const wrap = "mx-auto max-w-[1180px] px-5 md:px-8";
const card = "rounded-[24px] border border-line bg-surface";

function Heading({ title, sub }: { title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mx-auto mb-12 max-w-[760px] text-center md:mb-14">
      <h2 className="font-display text-[clamp(32px,4.4vw,52px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink text-balance">
        {title}
      </h2>
      {sub ? (
        <p className="mx-auto mt-4 max-w-[56ch] text-[17px] leading-relaxed text-muted text-balance">{sub}</p>
      ) : null}
    </div>
  );
}

/** Hand-drawn stroke under a highlighted word. */
function Underlined({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block text-blue">
      {children}
      <svg
        viewBox="0 0 300 16"
        preserveAspectRatio="none"
        className="absolute -bottom-[0.14em] left-[2%] h-[0.16em] w-[96%] text-blue"
        aria-hidden
      >
        <path d="M3 11C60 5 150 2 297 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-line bg-ground px-2.5 py-1 font-display text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
      {children}
    </span>
  );
}

function Arrow() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────

const HERO: Record<
  Audience,
  { title: React.ReactNode; sub: string; cta: { label: string; href: string }; frame: string }
> = {
  creators: {
    title: (
      <>
        Write it once.
        <br />
        Post it <Underlined>everywhere</Underlined>.
      </>
    ),
    sub: "Postbase turns one post into the right version for every network, shows you exactly how each will look, and publishes them on time.",
    cta: { label: "Start your 7-day free trial", href: "/login" },
    frame: "Your whole week in one calendar",
  },
  developers: {
    title: (
      <>
        Give your agent a<br />
        <Underlined>publish button</Underlined>.
      </>
    ),
    sub: "Connect Claude, Cursor or your own code over MCP or the REST API. Your agent drafts and schedules posts, and every one lands in your calendar.",
    cta: { label: "Get an API key", href: "/login" },
    frame: "Ask your agent, watch the post land",
  },
};

function Hero() {
  const { audience } = useAudience();
  const h = HERO[audience];
  return (
    <section className="relative isolate">
      <HeroDecor />
      <div className={`${wrap} pt-14 text-center md:pt-20`}>
        <Swap k={audience}>
          <h1 className="mx-auto max-w-[15ch] font-display text-[clamp(42px,6.8vw,84px)] font-semibold leading-[1.04] tracking-[-0.04em] text-ink">
            {h.title}
          </h1>
          <p className="mx-auto mt-6 max-w-[54ch] text-[17px] leading-relaxed text-muted text-balance md:text-[19px]">
            {h.sub}
          </p>
        </Swap>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 lg:hidden" aria-label="Supported networks">
          {NETWORKS.map((n) => (
            <span key={n} title={BRANDS[n]?.label}>
              <BrandTile platform={n} size={30} radius={8} />
            </span>
          ))}
        </div>

        <div className="mt-8">
          <a
            href={h.cta.href}
            className="inline-flex items-center gap-2 rounded-full bg-blue px-7 py-3.5 font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            {h.cta.label}
            <Arrow />
          </a>
          <p className="mt-3 text-[13px] text-muted">Cancel anytime · or self-host for free</p>
        </div>

        <div id="hero-toggle" className="mt-10 flex justify-center">
          <AudienceToggle />
        </div>

        <div id="product" className={`${card} mt-8 scroll-mt-28 p-3 text-left md:p-5`}>
          <Swap k={audience}>
            <h2 className="mb-4 mt-1 text-center font-display text-[18px] font-semibold text-ink md:mb-5 md:text-[22px]">
              {h.frame}
            </h2>
            {audience === "creators" ? (
              <div className="h-[700px] overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.45)]">
                <CalendarDemo productShot />
              </div>
            ) : (
              <AgentChatDemo />
            )}
          </Swap>
        </div>
      </div>
    </section>
  );
}

// ── Who it's for ─────────────────────────────────────────────────────────

function WhoFor() {
  const { setAudience } = useAudience();
  const show = (a: Audience) => {
    setAudience(a);
    document.getElementById("product")?.scrollIntoView({ behavior: "smooth" });
  };
  const items: { title: string; body: string; icon: React.ReactNode; action?: () => void; cta?: string }[] = [
    {
      title: "Creators",
      body: "Write a post once and send the right version to every network you're on. Plan the week in one sitting.",
      icon: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
      action: () => show("creators"),
      cta: "See the composer",
    },
    {
      title: "Agencies and teams",
      body: "A workspace per client, each with its own channels and people. Switch between brands from the sidebar.",
      icon: (
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      ),
    },
    {
      title: "Developers and agents",
      body: "Let Claude, Cursor or your own code schedule posts over MCP or the REST API, with the same calendar and guardrails.",
      icon: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
      action: () => show("developers"),
      cta: "See the agent",
    },
  ];
  return (
    <section className={`${wrap} pt-28 md:pt-36`}>
      <Heading title="Who is Postbase for?" />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className={`${card} flex flex-col p-7`}>
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue"
              aria-hidden
            >
              {it.icon}
            </svg>
            <h3 className="mt-6 font-display text-[21px] font-semibold tracking-[-0.01em] text-ink">{it.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{it.body}</p>
            {it.action ? (
              <button
                type="button"
                onClick={it.action}
                className="mt-5 self-start text-[14px] font-semibold text-blue hover:underline"
              >
                {it.cta} →
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Audience-specific sections ───────────────────────────────────────────

function AudienceSections() {
  const { audience } = useAudience();
  const creators = audience === "creators";
  return (
    <Swap k={audience}>
      {creators ? (
        <section className={`${wrap} pt-28 md:pt-36`}>
          <Heading
            title={
              <>
                Every feed gets its <Underlined>own cut</Underlined>
              </>
            }
            sub="Write the post once, then tailor it for each network in the same composer. Every version keeps to that network's character limit."
          />
          <div className="mx-auto h-[570px] max-w-[860px] overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.45)]">
            <ComposerShot />
          </div>
        </section>
      ) : (
        <ConnectSection />
      )}

      {creators ? null : (
        <section className={`${wrap} pt-28 md:pt-36`}>
          <Heading
            title="Every agent post lands in your calendar"
            sub="Posts your agent schedules sit next to yours, marked MCP. Review, edit or cancel them before they go out."
          />
          <div className="h-[700px] overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.4)]">
            <CalendarDemo showAgent />
          </div>
        </section>
      )}
    </Swap>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        });
      }}
      className="shrink-0 rounded-md border border-line bg-surface px-2 py-1 text-[11.5px] font-semibold text-ink transition-colors hover:border-ink"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const TOOLS: [string, string][] = [
  ["list_channels", "See which accounts are connected"],
  ["create_post", "Write a post or thread, then schedule it or save a draft"],
  ["list_scheduled", "Check what's queued, by status"],
  ["cancel_post", "Pull a scheduled post back to drafts"],
];

const ENDPOINTS: [string, string][] = [
  ["GET", "/api/v1/channels"],
  ["GET", "/api/v1/posts"],
  ["POST", "/api/v1/posts"],
  ["POST", "/api/v1/posts/:id/cancel"],
];

function ConnectCard({
  label,
  title,
  body,
  children,
}: {
  label: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${card} flex flex-col p-6 md:p-7`}>
      <div>
        <Pill>{label}</Pill>
      </div>
      <h3 className="mt-4 font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
      <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted">{body}</p>
      <div className="mt-6 flex flex-1 flex-col justify-end">{children}</div>
    </div>
  );
}

function ConnectSection() {
  return (
    <section className={`${wrap} pt-28 md:pt-36`}>
      <Heading
        title={
          <>
            Plug Postbase into <Underlined>any agent</Underlined>
          </>
        }
        sub="Postbase speaks MCP and plain HTTPS. Pick whichever fits the way you work."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <ConnectCard
          label="Via Claude"
          title="Custom connector"
          body="Paste the URL, sign in to Postbase and choose a workspace. No keys to copy around."
        >
          <div className="rounded-xl border border-line bg-ground p-3.5">
            <div className="text-[12px] font-medium text-muted">Remote MCP server URL</div>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-surface py-1.5 pl-3 pr-1.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">{MCP_URL}</span>
              <CopyButton text={MCP_URL} />
            </div>
          </div>
        </ConnectCard>

        <ConnectCard
          label="Via Cursor"
          title="Any MCP client"
          body="Run the Postbase MCP server with an API key from your Developers page."
        >
          <div className="rounded-xl border border-line bg-ground p-3.5">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1.5 pl-3 pr-1.5">
              <span className="font-mono text-[12.5px] text-muted">$</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">npx @postbasehq/mcp</span>
              <CopyButton text="npx @postbasehq/mcp" />
            </div>
          </div>
        </ConnectCard>

        <ConnectCard
          label="Via REST"
          title="Public API"
          body="Four endpoints with the same rules as the dashboard. Call it from a script, a cron job or your own app."
        >
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-ground">
            {ENDPOINTS.map(([m, path]) => (
              <li key={m + path} className="flex items-center gap-3 px-3.5 py-2.5 font-mono text-[12.5px]">
                <span className={`w-10 font-semibold ${m === "GET" ? "text-green" : "text-blue"}`}>{m}</span>
                <span className="truncate text-ink">{path}</span>
              </li>
            ))}
          </ul>
        </ConnectCard>

        <ConnectCard
          label="The tools"
          title="Four tools, nothing surprising"
          body="Your agent can't delete posts or change your account. Every key and connection can be revoked in one click."
        >
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-ground">
            {TOOLS.map(([name, what]) => (
              <li key={name} className="flex items-baseline gap-3 px-3.5 py-2.5">
                <code className="w-[112px] shrink-0 font-mono text-[12.5px] font-semibold text-ink">{name}</code>
                <span className="text-[12.5px] text-muted">{what}</span>
              </li>
            ))}
          </ul>
        </ConnectCard>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────

function Feature({
  label,
  title,
  body,
  mock,
  wide = false,
}: {
  label: string;
  title: string;
  body: string;
  mock: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`${card} grid content-start gap-6 p-6 md:p-7 ${wide ? "md:col-span-2 md:grid-cols-2 md:items-center" : ""}`}
    >
      <div>
        <Pill>{label}</Pill>
        <h3 className="mt-4 font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted">{body}</p>
      </div>
      <div>{mock}</div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className={`${wrap} scroll-mt-28 pt-28 md:pt-36`}>
      <Heading
        title={
          <>
            Everything you need to post, <Underlined>in one place</Underlined>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Feature
          wide
          label="Publishing"
          title="Posts that actually go out"
          body="Each post publishes at its time. If a network has a hiccup, Postbase retries. If something needs you, like a reconnect, it tells you."
          mock={<DeliveryMock />}
        />
        <Feature
          label="AI agent"
          title="Draft with the built-in agent"
          body="Ask for a post in plain words. The agent drafts it and asks before anything is scheduled."
          mock={<AgentMock />}
        />
        <Feature
          label="Media"
          title="One media library"
          body="Upload photos and video once, up to 1 GB each, and attach them to any post."
          mock={<MediaMock />}
        />
        <Feature
          label="Teams"
          title="A workspace per brand"
          body="Keep each client's channels and people separate. Useful when you run accounts for several clients."
          mock={<WorkspacesMock />}
        />
        <Feature
          label="Analytics"
          title="See what's working"
          body="Impressions, engagement and clicks for the posts you publish, per network, in one view."
          mock={<AnalyticsMock />}
        />
      </div>
    </section>
  );
}

// ── Channels ─────────────────────────────────────────────────────────────

function Channels() {
  return (
    <section id="channels" className={`${wrap} scroll-mt-28 pt-28 md:pt-36`}>
      <Heading
        title="The networks you post to"
        sub="Connect an account once and publish to it from the composer, the calendar or your agent."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {NETWORKS.map((n) => (
          <div key={n} className={`${card} flex flex-col items-center gap-3 px-3 py-6`}>
            <BrandTile platform={n} size={40} radius={11} />
            <span className="text-[14px] font-semibold text-ink">{BRANDS[n]?.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────

function Pricing() {
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" className={`${wrap} scroll-mt-28 pt-28 md:pt-36`}>
      <Heading
        title="Simple pricing, seven days free"
        sub="Every plan includes the MCP server and every network. Or run Postbase yourself for free."
      />
      <div className="mb-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-[14px] shadow-sm">
          {[false, true].map((yr) => (
            <button
              key={String(yr)}
              type="button"
              onClick={() => setAnnual(yr)}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                annual === yr ? "bg-blue text-on-blue" : "text-muted hover:text-ink"
              }`}
            >
              {yr ? "Annual" : "Monthly"}
              {yr ? <span className="ml-1.5 text-[12px] opacity-80">2 months free</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const popular = id === "team";
          const price = annual ? Math.round((p.monthly * 10) / 12) : p.monthly;
          return (
            <div key={id} className={`${card} flex flex-col p-6 ${popular ? "border-blue ring-1 ring-blue" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="font-display text-[16px] font-semibold text-ink">{p.name}</span>
                {popular ? (
                  <span className="rounded-full bg-blue px-2 py-0.5 text-[11px] font-semibold text-on-blue">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[14px] text-muted">{p.blurb}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="font-display text-[42px] font-semibold leading-none tracking-[-0.035em] text-ink">
                  ${price}
                </span>
                <span className="pb-1 text-[14px] font-medium text-muted">/month</span>
                {annual ? <span className="ml-auto pb-1 text-[12px] text-muted">billed yearly</span> : null}
              </div>
              <ul className="mb-7 mt-6 flex flex-col gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink">
                    <svg
                      className="mt-0.5 shrink-0 text-blue"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/billing"
                className={`mt-auto rounded-full px-4 py-2.5 text-center font-display text-[14px] font-semibold transition-colors ${
                  popular ? "bg-blue text-on-blue shadow-sm" : "border border-line text-ink hover:border-ink"
                }`}
              >
                Start 7-day trial
              </a>
            </div>
          );
        })}
      </div>
      <div className={`${card} mt-4 flex flex-wrap items-center gap-4 px-6 py-5`}>
        <div>
          <div className="font-display text-[16px] font-semibold text-ink">Self-host for free</div>
          <p className="mt-0.5 text-[14px] text-muted">
            The same product on your own servers, with your own platform API keys.
          </p>
        </div>
        <a
          href="https://github.com/postbasehq"
          className="ml-auto rounded-full border border-line px-5 py-2.5 font-display text-[14px] font-semibold text-ink transition-colors hover:border-ink"
        >
          View on GitHub
        </a>
      </div>
      <p className="mt-4 text-center text-[12.5px] text-muted">7-day free trial, card required. Cancel anytime.</p>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────────

const FAQ: [string, string][] = [
  [
    "Is Postbase open source?",
    "Yes. The code is on GitHub, and you can run it yourself for free with your own platform API keys. The hosted cloud is the paid, managed option.",
  ],
  [
    "Is there a free trial?",
    "Yes. Every plan starts with 7 days free. A card is required, and you can cancel any time before the trial ends.",
  ],
  [
    "Can AI agents post through Postbase?",
    "Yes. Add Postbase to Claude as a custom connector, or run @postbasehq/mcp in Cursor or any MCP client. Agents can list your channels, create and schedule posts or threads, check the queue and cancel posts.",
  ],
  ["Which networks does Postbase support?", "X, LinkedIn, Instagram, TikTok, YouTube, Bluesky and Mastodon."],
  [
    "Is there a public API?",
    "Yes. The REST API uses bearer keys you create on the Developers page. You can list channels, list and create posts, and cancel scheduled posts. Keys are stored as hashes and can be revoked any time.",
  ],
  [
    "Can I edit a post for just one network?",
    "Yes. Each network gets its own version of the post, so you can change the LinkedIn wording or turn the X version into a thread without touching the others.",
  ],
  [
    "What happens if a post fails to publish?",
    "Postbase retries temporary failures automatically. If a post needs you, for example because an account has to be reconnected, you'll see it in your notifications.",
  ],
  [
    "Can I manage several brands or clients?",
    "Yes. Each workspace has its own channels and team, and you can switch between them from the sidebar.",
  ],
];

function Faq() {
  return (
    <section id="faq" className={`${wrap} scroll-mt-28 pt-28 md:pt-36`}>
      <Heading title="Frequently asked questions" />
      <div className="mx-auto max-w-[820px] divide-y divide-line border-y border-line">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-[17px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {q}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-45"
                aria-hidden
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </summary>
            <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ── Closing ──────────────────────────────────────────────────────────────

function ClosingCta() {
  const { audience } = useAudience();
  return (
    <section className={`${wrap} py-28 md:py-36`}>
      <div className={`${card} relative isolate px-6 py-16 text-center md:py-20`}>
        <CtaDecor />
        <Swap k={audience}>
          <h2 className="font-display text-[clamp(34px,5vw,60px)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[17px] leading-relaxed text-muted">
            {audience === "creators"
              ? "Plan next week in one sitting and let Postbase handle the rest."
              : "Connect your agent in a minute and let it post the launch."}
          </p>
        </Swap>
        <a
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue px-7 py-3.5 font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
        >
          Start your 7-day free trial
          <Arrow />
        </a>
      </div>
    </section>
  );
}
