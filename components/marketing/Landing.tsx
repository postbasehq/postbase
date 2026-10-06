"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { AudienceProvider, AudienceToggle, Swap, useAudience, type Audience } from "@/components/marketing/Audience";
import { DevShot } from "@/components/marketing/DevShot";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { CreatorGrid } from "@/components/marketing/CreatorGrid";
import { DevGrid, McpOrRest } from "@/components/marketing/DevGrid";
import { HeroDecor } from "@/components/marketing/Decor";
import { Fit } from "@/components/marketing/Fit";
import { WhoFor as WhoForList } from "@/components/marketing/WhoFor";
import { PlanPicker } from "@/components/PlanPicker";
import { FAQ } from "@/components/marketing/faq";
import { Arrow, CtaBand, FaqList, Heading, Underlined, card, wrap } from "@/components/marketing/ui";

const NETWORKS = ["x", "linkedin", "instagram", "tiktok", "youtube", "bluesky", "mastodon"];

export function Landing({
  initialAudience = "creators",
  networkCards,
  aiToolCards,
}: {
  initialAudience?: Audience;
  /** Server-rendered link cards (components/marketing/HomeCards). */
  networkCards?: React.ReactNode;
  aiToolCards?: React.ReactNode;
}) {
  return (
    <AudienceProvider initial={initialAudience}>
      <SiteNav />
      <main>
        <Hero />
        <WhoFor />
        <Features />
        <Channels cards={networkCards} />
        <AiTools cards={aiToolCards} />
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
        Write it once.{" "}
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
        Give your agent a <br />
        <Underlined>publish button</Underlined>.
      </>
    ),
    sub: "Connect Claude, Cursor or your own code over MCP or the REST API. Every post your agent schedules lands in your calendar.",
    cta: { label: "Connect an agent", href: "/login" },
    frame: "Connect your agent from the AI & API page",
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
      <Swap k={audience}>
        {creators ? (
          <CreatorGrid />
        ) : (
          <>
            <McpOrRest />
            <DevGrid />
          </>
        )}
      </Swap>
    </section>
  );
}

// ── Channels ─────────────────────────────────────────────────────────────

function Channels({ cards }: { cards?: React.ReactNode }) {
  // One run is the networks repeated to fill a wide screen; the track holds two
  // runs so shifting it by -50% loops seamlessly.
  const networks = [...NETWORKS, "facebook"];
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
      {cards ? <div className={`${wrap} mt-12`}>{cards}</div> : null}
    </section>
  );
}

// ── AI tools ─────────────────────────────────────────────────────────────

function AiTools({ cards }: { cards?: React.ReactNode }) {
  if (!cards) return null;
  return (
    <section id="ai-tools" className={`${wrap} scroll-mt-28 pt-28 md:pt-36`}>
      <Heading
        title={
          <>
            Works with <Underlined>your AI tool</Underlined>
          </>
        }
        sub="Add the Postbase MCP server and your AI tool can draft and schedule posts for you."
      />
      {cards}
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section id="pricing" className={`${wrap} scroll-mt-28 pt-28 md:pt-36`}>
      <Heading
        title="Simple pricing, seven days free"
        sub="Every plan includes every network, the AI agent and the MCP server. Or run Postbase yourself for free."
      />
      <PlanPicker showSelfHost />
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
