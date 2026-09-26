"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { AudienceProvider, AudienceToggle, Swap, useAudience, type Audience } from "@/components/marketing/Audience";
import { DevShot } from "@/components/marketing/DevShot";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { CreatorGrid } from "@/components/marketing/CreatorGrid";
import { DevGrid } from "@/components/marketing/DevGrid";
import { HeroDecor } from "@/components/marketing/Decor";
import { Fit } from "@/components/marketing/Fit";
import { WhoFor as WhoForList } from "@/components/marketing/WhoFor";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { FAQ } from "@/components/marketing/faq";
import { Arrow, CtaBand, FaqList, Heading, Underlined, card, wrap } from "@/components/marketing/ui";

const NETWORKS = ["x", "linkedin", "instagram", "tiktok", "youtube", "bluesky", "mastodon"];

export function Landing({ initialAudience = "creators" }: { initialAudience?: Audience }) {
  return (
    <AudienceProvider initial={initialAudience}>
      <SiteNav />
      <main>
        <Hero />
        <WhoFor />
        <Features />
        <Channels />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
      <FloatingToggle />
    </AudienceProvider>
  );
}

/** Floating switch pinned bottom-left, shown once the hero's switch scrolls away. */
function FloatingToggle() {
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
      className={`fixed bottom-4 left-4 z-50 rounded-full border max-sm:[zoom:0.88] sm:bottom-5 sm:left-5 border-line bg-surface px-4 py-2.5 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.35)] transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
        show ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <AudienceToggle compact />
    </div>
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
    sub: "The open-source social media scheduler that tailors one post for every network and publishes each one on time.",
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
    sub: "Connect Claude, Cursor or your own code over MCP or the REST API. Every post your agent schedules lands in your calendar.",
    cta: { label: "Get an API key", href: "/login" },
    frame: "Connect your agent from the Developers page",
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
              <Fit minWidth={860} height={700} mobile={{ renderWidth: 860, viewWidth: 430, x: 196, y: 124, height: 470 }}>
                <div className="h-full overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.45)]">
                  <CalendarDemo productShot />
                </div>
              </Fit>
            ) : (
              <Fit minWidth={900} height={700} mobile={{ renderWidth: 480, viewWidth: 480, height: 700 }}>
                <div className="h-full overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.45)]">
                  <DevShot />
                </div>
              </Fit>
            )}
          </Swap>
        </div>
      </div>
    </section>
  );
}

// ── Who it's for ─────────────────────────────────────────────────────────

function WhoFor() {
  return (
    <section className={`${wrap} pt-28 md:pt-36`}>
      <Heading title="Who is Postbase for?" />
      <WhoForList />
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────

function Features() {
  const { audience } = useAudience();
  const creators = audience === "creators";
  return (
    <section id="features" className={`${wrap} scroll-mt-28 pt-28 md:pt-36`}>
      <Heading
        title={
          creators ? (
            <>
              Everything you need to post, <Underlined>in one place</Underlined>
            </>
          ) : (
            <>
              Plug Postbase into <Underlined>any agent</Underlined>
            </>
          )
        }
        sub={
          creators
            ? "From the first draft to the numbers afterwards, without leaving Postbase."
            : "MCP for your AI tools, a REST API for everything else, and a calendar that shows what they did."
        }
      />
      <Swap k={audience}>{creators ? <CreatorGrid /> : <DevGrid />}</Swap>
    </section>
  );
}

// ── Channels ─────────────────────────────────────────────────────────────

function Channels() {
  // One run is the networks repeated to fill a wide screen; the track holds two
  // runs so shifting it by -50% loops seamlessly.
  const networks = [...NETWORKS, "facebook", "threads"];
  const run = [...networks, ...networks, ...networks];
  return (
    <section id="channels" className="scroll-mt-28 pt-28 md:pt-36">
      <div className={wrap}>
        <Heading
          title="The networks you post to"
          sub="Connect an account once and publish to it from the composer, the calendar or your agent."
        />
      </div>
      <div
        className="overflow-hidden py-4"
        style={{
          maskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
        }}
      >
        <div className="marquee flex w-max max-sm:[zoom:0.7]">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 gap-5 pr-5 md:gap-7 md:pr-7" aria-hidden={half === 1}>
              {run.map((n, i) => (
                <span key={`${n}-${i}`} title={BRANDS[n]?.label} className="shrink-0">
                  <BrandTile platform={n} size={112} radius={28} />
                </span>
              ))}
            </div>
          ))}
        </div>
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


function Faq() {
  return (
    <section id="faq" className={`${wrap} scroll-mt-28 pt-28 md:pt-36`}>
      <Heading title="Frequently asked questions" />
      <FaqList items={FAQ} />
    </section>
  );
}

// ── Closing ──────────────────────────────────────────────────────────────

function ClosingCta() {
  const { audience } = useAudience();
  const creators = audience === "creators";
  return (
    <section className={`${wrap} py-28 md:py-36`}>
      <Swap k={audience}>
        <CtaBand
          developers={!creators}
          body={
            creators
              ? "Plan next week in one sitting. Postbase shapes each post for every network and publishes it on time."
              : "Connect your agent in a minute. It drafts and schedules, and you see every post in your calendar."
          }
          secondary={creators ? { label: "See pricing", href: "#pricing" } : { label: "Read the docs", href: "https://docs.postbase.so/mcp/connect" }}
        />
      </Swap>
    </section>
  );
}
