import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { LogoMark } from "@/components/marketing/Decor";
import { Arrow, CtaBand, card, wrap } from "@/components/marketing/ui";
import { SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { BRANDS } from "@/components/BrandTile";
import { listPosts } from "@/lib/blog";

const EMAIL = "team@postbase.so";
const DESCRIPTION =
  "Questions about scheduling, the MCP server, the API or your plan? Email the Postbase team, read the docs or open an issue on GitHub.";

export const metadata: Metadata = {
  title: "Contact Postbase: support, bugs and partnerships",
  description: DESCRIPTION,
  ...pageMeta("/contact"),
};

// Postbase blue, amber and red (solid, same in light and dark).
const TONES = ["#2b59d9", "#e3a72c", "#d14a3e"];

type Way = { title: string; body: string; href: string; cta: string; icon: React.ReactNode };

const icon = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const WAYS: Way[] = [
  {
    title: "Documentation",
    body: "Setup guides for every network, the MCP server and the REST API.",
    href: "https://docs.postbase.so",
    cta: "Read the docs",
    icon: icon("M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5v-2ZM4 19.5A2.5 2.5 0 0 1 6.5 17H20"),
  },
  {
    title: "Bugs and feature requests",
    body: "Found something broken or missing? Open an issue and follow it in public.",
    href: "https://github.com/postbasehq/postbase/issues",
    cta: "Open an issue",
    icon: icon("M12 20v-9M8 6l1.5 1.5M16 6l-1.5 1.5M6 13H2M22 13h-4M6 9a6 6 0 0 1 12 0v5a6 6 0 0 1-12 0V9Z"),
  },
  {
    title: "Self-hosting",
    body: "Running Postbase on your own servers? The install guide covers every step.",
    href: "https://docs.postbase.so/self-hosting/installation",
    cta: "Install guide",
    icon: icon("M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01"),
  },
  {
    title: "Security",
    body: "Found a vulnerability? Email us privately first, not in a public issue.",
    href: `mailto:${EMAIL}?subject=Security`,
    cta: "Report privately",
    icon: icon("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
  },
  {
    title: "Partnerships and agencies",
    body: "Managing lots of clients, or want Postbase in your own product? Let's talk.",
    href: `mailto:${EMAIL}?subject=Partnerships`,
    cta: "Email us",
    icon: icon("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"),
  },
  {
    title: "Your data",
    body: "Remove a connected account and its tokens, or ask us to delete your data.",
    href: "/data-deletion",
    cta: "Data deletion",
    icon: icon("M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"),
  },
];

/** The main way in: one email address, with the Postbase mark on a blue panel. */
function EmailCard() {
  return (
    <a
      href={`mailto:${EMAIL}`}
      className={`${card} group relative isolate grid overflow-hidden transition-colors hover:border-[#2b59d9] md:grid-cols-[1.1fr_1fr]`}
    >
      <div className="p-8 md:p-12">
        <p className="font-display text-[14px] font-semibold text-muted">Email the team</p>
        <p className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
          {EMAIL}
        </p>
        <p className="mt-4 max-w-[44ch] text-[16px] leading-relaxed text-muted">
          A problem with a post, a question about your plan or billing, or anything else. No account needed, and a
          person on the team reads and answers every email.
        </p>
        <span className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#2b59d9] px-5 py-3 font-display text-[15px] font-semibold text-white shadow-sm transition-shadow group-hover:shadow-md">
          Write to us
          <Arrow />
        </span>
      </div>
      {/* Each mark stays flush with its edge and slides along it on hover. */}
      <div className="relative hidden min-h-[280px] bg-[#2b59d9] md:block" aria-hidden>
        <LogoMark
          color="#e3a72c"
          className="absolute right-10 top-0 w-[230px] transition-transform duration-700 ease-out group-hover:-translate-x-4"
        />
        <LogoMark
          color="#d14a3e"
          edge="left"
          className="absolute bottom-10 left-0 w-[120px] transition-transform duration-700 ease-out group-hover:-translate-y-4"
        />
        <LogoMark
          color="#ffffff"
          edge="right"
          className="absolute bottom-8 right-0 w-[92px] transition-transform duration-700 ease-out group-hover:-translate-y-4"
        />
      </div>
    </a>
  );
}

function WayCard({ way, tone }: { way: Way; tone: string }) {
  const external = way.href.startsWith("http");
  return (
    <a
      href={way.href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`${card} group relative isolate flex h-full flex-col overflow-hidden p-7 transition-colors hover:border-[var(--tone)]`}
      style={{ "--tone": tone } as React.CSSProperties}
    >
      {/* One colour only: light falling from the icon tile, spreading a little on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 -z-10 size-[340px] opacity-[0.16] transition-[opacity,transform] duration-700 ease-out group-hover:scale-110 group-hover:opacity-25"
        style={{ background: `radial-gradient(closest-side, ${tone}, transparent)` }}
      />
      <span
        className="flex size-12 items-center justify-center rounded-2xl text-white transition-transform duration-300 group-hover:-rotate-6"
        style={{ backgroundColor: tone, color: tone === "#e3a72c" ? "#14161a" : "#fff" }}
      >
        {way.icon}
      </span>
      <h3 className="mt-6 font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">{way.title}</h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{way.body}</p>
      <span className="mt-6 inline-flex items-center gap-2 font-display text-[14px] font-semibold text-ink">
        {way.cta}
        <span className="transition-transform duration-300 group-hover:translate-x-1">
          <Arrow />
        </span>
      </span>
    </a>
  );
}

const GITHUB_PATH =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
};

/** X, GitHub and the blog as tiles, then the latest posts as a Postbase-style queue. */
function FollowCard() {
  const posts = listPosts().slice(0, 8);
  const glyph = (d: string) => (
    <svg viewBox="0 0 24 24" aria-hidden className="size-full" fill="currentColor">
      <path d={d} />
    </svg>
  );
  const channels = [
    { href: "https://x.com/postbasehq", label: "X", handle: "@postbasehq", bg: "#000000", mark: glyph(BRANDS.x.path) },
    { href: "https://github.com/postbasehq/postbase", label: "GitHub", handle: "postbasehq", bg: "#24292f", mark: glyph(GITHUB_PATH) },
    // The Postbase mark isn't a glyph to crop: it hangs whole from the flat top edge, clear of the corner.
    { href: "/blog", label: "Blog", handle: "Guides and updates", bg: "#2b59d9", mark: null },
  ];
  return (
    <div className={`${card} flex flex-col p-8`}>
      <h2 className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">Follow along</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">New networks, product updates and what we&apos;re building next.</p>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {channels.map((c) => (
          <a
            key={c.href}
            href={c.href}
            {...(c.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            className="relative isolate flex min-h-[92px] flex-col justify-end overflow-hidden rounded-2xl p-3 text-white"
            style={{ backgroundColor: c.bg }}
          >
            {/* The mark peeks in from the top-right corner, cropped by the card. */}
            <span
              className="pointer-events-none absolute -right-1.5 -top-1.5 -z-10 size-[58px]"
              aria-hidden
            >
              {c.mark}
            </span>
            {c.mark === null ? (
              <LogoMark color="#ffffff" className="pointer-events-none absolute right-5 top-0 -z-10 w-[46px]" />
            ) : null}
            <span className="block font-display text-[14px] font-semibold">{c.label}</span>
            <span className="block truncate text-[12px] text-[#dde3ee]">{c.handle}</span>
          </a>
        ))}
      </div>

      {/* The latest real posts, each filled with a brand colour and the Postbase mark hanging from its top edge.
          The list fills whatever height the Company card sets without adding to it: it's absolutely
          positioned, and flex-wrap pushes any row that won't fit whole into a hidden second column. */}
      <div className="relative mt-4 min-h-[196px] flex-1">
      <ul className="absolute inset-0 flex flex-col flex-wrap gap-2 overflow-hidden">
        {posts.map((p, i) => {
          const tone = TONES[i % 3];
          const amber = tone === "#e3a72c";
          return (
            <li key={p.slug} className="w-full">
              <a
                href={`/blog/${p.slug}`}
                className="relative isolate block overflow-hidden rounded-2xl p-3 pr-16"
                style={{ backgroundColor: tone, color: amber ? "#14161a" : "#ffffff" }}
              >
                <LogoMark
                  color={amber ? "#14161a" : "#ffffff"}
                  className="pointer-events-none absolute right-5 top-0 -z-10 w-[40px]"
                />
                <span className="block truncate text-[14px] font-medium">{p.title}</span>
                <span className="block text-[12px]" style={{ color: amber ? "#3d3420" : "#dde3ee" }}>
                  {p.category} · {shortDate(p.date)}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}

/** Who you're dealing with: the holding company, and Postbase as its trading name. */
function CompanyCard() {
  return (
    <div className={`${card} flex flex-col p-8`}>
      <h2 className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">Company details</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Postbase is a trading name of Berkway, the holding company behind it. Your agreement for the
        hosted service is with Berkway.
      </p>

      <div className="mt-6 flex flex-1 flex-col justify-center rounded-2xl border border-line bg-surface-2 p-4">
        {/* Holding company */}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-ink text-surface">
            {icon("M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 10h.01M15 10h.01M9 14h.01M15 14h.01")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-semibold text-ink">Berkway</span>
            <span className="block text-[12px] text-muted">Registered in England and Wales</span>
          </span>
          <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-surface">Holding company</span>
        </div>
        {/* The registered details, as they appear in the Terms. */}
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-line bg-surface px-3.5 py-3 text-[13px]">
          <dt className="text-muted">Company number</dt>
          <dd className="font-medium tabular-nums text-ink">
            <a
              href="https://berkway.co.uk"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-line underline-offset-2 transition-colors hover:decoration-ink"
            >
              16591862
            </a>
          </dd>
          <dt className="text-muted">Registered office</dt>
          <dd className="font-medium text-ink">3rd Floor, 86-90 Paul Street, London, EC2A 4NE</dd>
        </dl>

        {/* "trading as" link between the two */}
        <div className="flex items-center gap-3 py-1 pl-[34px]" aria-hidden>
          <span className="h-7 w-0.5 rounded-full bg-[#2b59d9]" />
          <span className="font-mono text-[11px] text-muted">trading as</span>
        </div>

        {/* The product */}
        <div className="flex items-center gap-3 rounded-xl border border-[#2b59d9] bg-surface p-3.5 ring-1 ring-[#2b59d9]">
          <span className="size-10 shrink-0 overflow-hidden rounded-[11px] shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/postbase-icon.png" alt="" className="size-full object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-semibold text-ink">Postbase</span>
            <span className="block text-[12px] text-muted">The hosted app and the open-source project</span>
          </span>
          <span className="shrink-0 rounded-full bg-[#2b59d9] px-2.5 py-1 text-[11px] font-semibold text-white">Product</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { href: "/terms", label: "Terms of service" },
          { href: "/privacy", label: "Privacy policy" },
        ].map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-display text-[14px] font-semibold text-ink transition-colors hover:border-ink"
          >
            {l.label}
            <Arrow />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function ContactPage() {
  const trail = [{ label: "Home", href: "/" }, { label: "Contact" }];
  return (
    <>
      <SeoJsonLd path="/contact" name="Contact Postbase" description={DESCRIPTION} trail={trail} />
      <SiteNav />
      <main>
        <SeoHero
          trail={trail}
          h1={["Talk to a", "real person"]}
          sub="Questions about scheduling, the MCP server, the API or your plan? Pick the way that suits you and someone on the team will answer."
          cta={{ label: "Email the team", href: `mailto:${EMAIL}` }}
          secondary={{ label: "Read the docs", href: "https://docs.postbase.so" }}
          note={null}
        />

        <section className={`${wrap} pt-16 md:pt-20`}>
          <EmailCard />
        </section>

        <section className={section}>
          <SectionHead title="Other ways to reach us" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WAYS.map((w, i) => (
              <WayCard key={w.title} way={w} tone={TONES[i % 3]} />
            ))}
          </div>
        </section>

        <section className={section}>
          <div className="grid gap-4 md:grid-cols-2">
            <FollowCard />
            <CompanyCard />
          </div>
        </section>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand body="Connect your accounts, write your first post and schedule it in a few minutes." secondary={{ label: "See pricing", href: "/pricing" }} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
