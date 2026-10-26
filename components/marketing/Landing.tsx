"use client";

import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { LOGOS } from "@/components/ClientLogo";
import { AudienceProvider, AudienceToggle, Swap, useAudience, type Audience } from "@/components/marketing/Audience";
import { McpInActionDemo } from "@/components/marketing/seo/McpDemo";
import { MCP_SCENES } from "@/lib/seo/mcp-scenes";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { CreatorGrid } from "@/components/marketing/CreatorGrid";
import { DevGrid, McpOrRest } from "@/components/marketing/DevGrid";
import { HeroPostbots } from "@/components/marketing/Decor";
import { Fit } from "@/components/marketing/Fit";
import { WhoFor as WhoForList } from "@/components/marketing/WhoFor";
import { PlanPicker } from "@/components/PlanPicker";
import { FAQ } from "@/components/marketing/faq";
import { CtaBand, FaqList, Heading, Underlined, wideWrap, wrap } from "@/components/marketing/ui";

const NETWORKS = ["x", "linkedin", "instagram", "tiktok", "youtube", "reddit", "bluesky", "mastodon"];

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

/** A logo for the headline cycler: draws itself into the given class. */
type Mark = { id: string; label: string; draw: (className: string) => React.ReactNode };

// Near-black marks (X, TikTok, ChatGPT, Cursor, Windsurf) follow the text colour so they show in dark mode.
const ink = (color: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return Math.max(r, g, b) < 0x30 ? "currentColor" : color;
};

const NETWORK_MARKS: Mark[] = NETWORKS.map((n) => {
  const b = BRANDS[n];
  // Instagram's thin outline glyph reads poorly at this size, so it gets its app icon.
  if (n === "instagram") {
    return {
      id: n,
      label: b.label,
      draw: (className) => (
        <svg key={n} aria-hidden className={className} viewBox="0 0 24 24">
          <defs>
            <radialGradient id="hero-ig" cx="0.3" cy="1.07" r="1.2">
              <stop offset="0" stopColor="#fdf497" />
              <stop offset="0.1" stopColor="#fdf497" />
              <stop offset="0.5" stopColor="#fd5949" />
              <stop offset="0.68" stopColor="#d6249f" />
              <stop offset="1" stopColor="#285aeb" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6.5" fill="url(#hero-ig)" />
          <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="16.1" cy="7.9" r="1.05" fill="#fff" />
        </svg>
      ),
    };
  }
  return {
    id: n,
    label: b.label,
    draw: (className) => (
      <svg key={n} aria-hidden className={className} viewBox={b.viewBox ?? "0 0 24 24"} fill={ink(b.bg)}>
        <path d={b.path} />
      </svg>
    ),
  };
});

const AGENT_MARKS: Mark[] = [
  ["claude", "Claude"],
  ["chatgpt", "ChatGPT"],
  ["cursor", "Cursor"],
  ["vscode", "VS Code"],
  ["windsurf", "Windsurf"],
  ["gemini", "Gemini"],
].map(([id, label]) => ({
  id,
  label,
  draw: (className) => (
    <svg key={id} aria-hidden className={className} viewBox="0 0 24 24" fill={ink(LOGOS[id].color)}>
      <path d={LOGOS[id].path} />
    </svg>
  ),
}));


const HERO: Record<
  Audience,
  { title: React.ReactNode; sub: string; cta: { label: string; href: string } }
> = {
  creators: {
    title: (
      <>
        <span className="md:whitespace-nowrap">
          <span className="whitespace-nowrap">
            Your <LogoCycler marks={NETWORK_MARKS} /> posts,
          </span>{" "}
          planned,
        </span>
        <br className="hidden md:inline" /> scheduled and published
      </>
    ),
    sub: "The open-source distribution and growth platform. Schedule everywhere, find the conversations worth joining, and let AI agents run the rest of your marketing.",
    cta: { label: "Start 7-day trial", href: "/login" },
  },
  developers: {
    title: (
      <>
        Social posting{" "}
        <span className="whitespace-nowrap">
          for <LogoCycler marks={AGENT_MARKS} /> AI agents
        </span>
      </>
    ),
    sub: "Connect Claude, Cursor or your own code over MCP or the REST API. Every post your agent schedules lands in your calendar.",
    cta: { label: "Connect an agent", href: "/login" },
  },
};

/** A logo inside the headline that crossfades through a set of marks (networks, or AI agents). */
function LogoCycler({ marks }: { marks: Mark[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % marks.length), 2000);
    return () => clearInterval(t);
  }, [marks.length]);
  return (
    <span
      role="img"
      aria-label={marks.map((m) => m.label).join(", ")}
      className="relative -my-[0.1em] mx-[0.1em] inline-block size-[0.82em] align-[-0.1em]"
    >
      {/* Every logo is stacked in place and crossfaded, so the swap is soft. */}
      {marks.map((m, k) =>
        m.draw(`absolute inset-0 size-full transition-opacity duration-700 ease-in-out ${k === i ? "opacity-100" : "opacity-0"}`),
      )}
    </span>
  );
}

/** One-click sign-up: straight to Google, skipping the login page. */
function GoogleCta() {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    track("generate_lead", { method: "google" });
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is redirected to Google; otherwise fall back to the login page.
    if (error) window.location.href = "/login";
  }
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      aria-label="Continue with Google"
      // On phones it's a round "G" beside the trial button; the label returns from sm up.
      className="inline-flex h-[50px] w-[50px] shrink-0 items-center justify-center gap-2.5 rounded-full border border-line bg-surface font-display sm:w-auto sm:px-7 text-[15px] font-semibold text-ink shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-70"
    >
      <GoogleIcon />
      <span className="hidden sm:inline">{busy ? "Redirecting" : "Continue with Google"}</span>
    </button>
  );
}

function Hero() {
  const { audience } = useAudience();
  const h = HERO[audience];
  return (
    <section className="relative isolate">
      <HeroPostbots />
      <div className={`${wrap} pt-14 text-center md:pt-20`}>
        <Swap k={audience}>
          <h1
            data-hero-avoid
            className={`mx-auto font-display font-semibold leading-[1.15] tracking-[-0.04em] text-ink ${
              // Balanced over two lines on wide screens.
              "max-w-[1120px] text-[clamp(42px,4.8vw,64px)] text-balance"
            }`}
          >
            {h.title}
          </h1>
          <p data-hero-avoid className="mx-auto mt-5 max-w-[36ch] text-[15px] leading-relaxed text-muted text-balance sm:max-w-[54ch] sm:text-[17px] md:mt-6 md:max-w-[76ch] md:text-[19px]">
            {h.sub}
          </p>
        </Swap>

        <div data-hero-avoid className="mx-auto mt-8 flex w-fit items-center justify-center gap-3">
          <a
            href={h.cta.href}
            className="inline-flex h-[50px] items-center gap-2 rounded-full bg-blue px-7 font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            {h.cta.label}
          </a>
          <GoogleCta />
        </div>

        <div id="hero-toggle" className="mt-10 flex justify-center">
          <AudienceToggle />
        </div>

        <div id="product" className="mt-8 scroll-mt-28 text-left">
          <Swap k={audience}>
            {audience === "creators" ? (
              <Fit minWidth={860} height={700} mobile={{ renderWidth: 860, viewWidth: 430, x: 196, y: 124, height: 470 }}>
                <div className="h-full overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.45)]">
                  <CalendarDemo productShot />
                </div>
              </Fit>
            ) : (
              // Claude scheduling through Postbase over MCP, and the post landing
              // on the calendar: the headline's promise, shown (text networks only).
              <McpInActionDemo scene={MCP_SCENES.hub} />
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
    <section id="pricing" className={`${wideWrap} scroll-mt-28 pt-28 md:pt-36`}>
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
