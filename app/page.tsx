import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AgentDemo } from "@/components/AgentDemo";
import { ComposerDemo } from "@/components/marketing/ComposerDemo";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { PreviewWall } from "@/components/marketing/PreviewWall";
import { BrandTile, BRANDS } from "@/components/BrandTile";

const NETWORKS = ["x", "linkedin", "instagram", "tiktok", "youtube", "bluesky", "mastodon"];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-blue-ink">
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteNav />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        {/* backdrop glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-[-120px] h-[560px]"
          style={{
            background:
              "radial-gradient(680px 340px at 50% 0%, color-mix(in oklab, var(--blue-soft) 90%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-[900px] px-6 pt-12 text-center md:pt-20">
          <a
            href="https://github.com/postbasehq"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm backdrop-blur"
          >
            <span className="size-1.5 rounded-full bg-green" />
            Open-source · MCP-native
            <span className="text-muted">→ Star on GitHub</span>
          </a>
          <h1 className="mx-auto mt-5 max-w-[16ch] font-display text-[clamp(36px,7vw,72px)] font-semibold leading-[1.02] tracking-[-0.025em] text-balance">
            Write once. Publish{" "}
            <span className="text-terra">everywhere.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-muted text-balance md:text-[19px]">
            The open-source scheduler that shapes one post for every network — and lets
            Claude, Cursor, or any agent do it for you over MCP.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="/login"
              className="rounded-full bg-blue px-6 py-3 font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
            >
              Start for $0
            </a>
            <a
              href="#composer"
              className="rounded-full border border-line bg-surface px-6 py-3 font-display text-[15px] font-semibold text-blue-ink transition-colors hover:bg-surface-2"
            >
              See it live ↓
            </a>
          </div>
          <p className="mt-4 text-[13.5px] text-muted">
            7-day trial · cancel anytime · or <b className="text-ink">self-host for free</b>
          </p>
        </div>

        {/* live product — the real composer */}
        <div id="composer" className="relative mx-auto mt-12 max-w-[1120px] scroll-mt-20 px-4 md:mt-16 md:px-6">
          <div className="h-[600px] overflow-hidden rounded-[20px] border border-line bg-surface shadow-[0_40px_120px_-40px_rgba(16,24,40,0.5)] md:h-[620px]">
            <ComposerDemo />
          </div>
          <p className="mt-3 text-center text-[13px] text-muted">
            ↑ This is the real app. Type in the composer and switch channels — the preview is live.
          </p>
        </div>

        {/* networks */}
        <div className="mx-auto mt-12 flex max-w-[1120px] flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 text-[13.5px] text-muted md:mt-14">
          <span className="font-medium">Publishes to</span>
          {NETWORKS.map((n) => (
            <span key={n} className="inline-flex items-center gap-2 font-medium text-ink">
              <BrandTile platform={n} size={18} radius={5} />
              {BRANDS[n]?.label}
            </span>
          ))}
        </div>
      </header>

      {/* ── ONE IDEA, EVERY NETWORK ──────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="mb-9 max-w-[56ch]">
            <Eyebrow>Native previews</Eyebrow>
            <h2 className="mt-3 font-display text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em]">
              One idea, shaped for every feed.
            </h2>
            <p className="mt-3.5 text-[17px] leading-relaxed text-muted">
              Postbase renders exactly what each network will show — an X thread, a LinkedIn
              card, an Instagram grid post, a TikTok. No guessing before you hit publish. These
              are the real preview cards from the app.
            </p>
          </div>
          <PreviewWall />
        </div>
      </section>

      {/* ── CALENDAR ─────────────────────────────────────────────── */}
      <section className="bg-surface-2/50 py-20">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="mb-9 max-w-[56ch]">
            <Eyebrow>Calendar &amp; queue</Eyebrow>
            <h2 className="mt-3 font-display text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em]">
              See the whole week before it goes out.
            </h2>
            <p className="mt-3.5 text-[17px] leading-relaxed text-muted">
              Everything scheduled, publishing, and published — in one calendar. Drag to
              reschedule, edit or cancel before it ships. A real engine runs each post at its
              time and retries transient failures.
            </p>
          </div>
          <div className="h-[560px] overflow-hidden rounded-[20px] border border-line bg-surface shadow-[0_30px_90px_-40px_rgba(16,24,40,0.45)]">
            <CalendarDemo />
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="mb-9 max-w-[52ch]">
            <Eyebrow>The rail</Eyebrow>
            <h2 className="mt-3 font-display text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em]">
              A dependable place to schedule and publish.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Per-channel variants", "Tailor the wording per platform from one post — a thread on X, a cleaner cut on LinkedIn.", "M4 7h16M4 12h10M4 17h7"],
              ["Media library", "Upload once, reuse anywhere. Images and video on Cloudflare R2, attached in a click.", "M3 3h18v18H3zM3 15l5-5 4 4 3-3 6 6"],
              ["Generate with AI", "Draft copy and generate images or video right in the composer, then schedule it.", "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8"],
              ["Reliable publishing", "A real scheduling engine runs each post on time, retries failures, and flags what needs you.", "M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"],
              ["Teams & clients", "Organisations hold many channels — built for agencies running more than one account.", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
              ["Open-source", "The whole thing is open. Use our cloud, or run it yourself with your own keys — free.", "M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"],
            ].map(([title, body, path]) => (
              <div key={title} className="rounded-2xl border border-line bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-blue-soft text-blue-ink">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={path} />
                  </svg>
                </div>
                <h3 className="font-display text-[16.5px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEVELOPERS / MCP ─────────────────────────────────────── */}
      <section id="developers" className="bg-[#12141b] py-20 text-white">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="mb-9 max-w-[56ch]">
            <div className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-[#8ab4f8]">
              For developers
            </div>
            <h2 className="mt-3 font-display text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em] text-white">
              Your agent operates the same rail you do.
            </h2>
            <p className="mt-3.5 text-[17px] leading-relaxed text-white/70">
              Add the Postbase MCP server to Claude, Cursor, or any client — it drafts,
              schedules, and publishes through the exact API the dashboard uses.
            </p>
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div>
              <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-[13px] leading-7 text-[#e6e8ef]">
{`{
  "mcpServers": {
    "postbase": {
      "command": "npx",
      "args": ["@postbasehq/mcp"],
      "env": { "POSTBASE_API_KEY": "pb_live_…" }
    }
  }
}`}
              </pre>
              <div className="mt-4 flex flex-wrap gap-2">
                {["list_channels", "create_post", "schedule_thread", "list_scheduled", "cancel_post"].map((t) => (
                  <span key={t} className="rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 font-mono text-[12.5px] text-white/80">
                    {t}
                  </span>
                ))}
              </div>
              <a
                href="https://docs.postbase.so/mcp/connect"
                className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#8ab4f8]"
              >
                Read the MCP docs →
              </a>
            </div>
            {/* the real agent demo (light-on-dark, kept in a surface) */}
            <div className="rounded-2xl bg-ground p-1 text-ink shadow-xl">
              <AgentDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="mb-9 max-w-[52ch]">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-3 font-display text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.1] tracking-[-0.015em]">
              Start with a 7-day trial. Self-host free.
            </h2>
            <p className="mt-3.5 text-[17px] leading-relaxed text-muted">
              Every plan is a full Postbase account. Prefer to run it yourself? Self-hosting is
              free, forever.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Creator", "$29", "Solo creators & personal brands.", ["Core channels", "Calendar & queue", "MCP server + API"], false],
              ["Team", "$39", "Small brands with a couple of hands.", ["More channels", "Per-channel variants", "Team seats"], true],
              ["Business", "$49", "Growing brands publishing at volume.", ["Higher limits", "Priority publishing", "Team seats"], false],
              ["Agency", "$99", "Agencies managing many client accounts.", ["Client workspaces", "Bring-your-own keys", "Approvals (soon)"], false],
            ].map(([name, price, who, feats, pop]) => (
              <div
                key={name as string}
                className={`flex flex-col gap-1.5 rounded-2xl border bg-surface p-5 shadow-sm ${
                  pop ? "border-blue shadow-md" : "border-line"
                }`}
              >
                {pop ? (
                  <span className="self-start rounded-md bg-blue-soft px-2.5 py-1 font-display text-[10.5px] font-semibold uppercase tracking-wide text-blue-ink">
                    Most popular
                  </span>
                ) : null}
                <div className="font-display text-[15px] font-semibold">{name}</div>
                <div className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.02em]">
                  {price}
                  <span className="text-sm font-medium text-muted">/mo</span>
                </div>
                <div className="min-h-[34px] text-[13px] text-muted">{who}</div>
                <ul className="my-2 flex flex-col gap-1.5">
                  {(feats as string[]).map((f) => (
                    <li key={f} className="relative pl-5.5 text-[13.5px] before:absolute before:left-0 before:font-bold before:text-green before:content-['✓']">
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/login"
                  className={`mt-auto rounded-full px-4 py-2.5 text-center font-display text-sm font-semibold ${
                    pop
                      ? "bg-blue text-on-blue shadow-sm"
                      : "border border-line text-blue-ink hover:bg-surface-2"
                  }`}
                >
                  Start trial
                </a>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-line bg-surface p-5">
            <div>
              <div className="font-display text-base font-semibold">Self-host — free</div>
              <p className="mt-0.5 text-sm text-muted">
                Run the open-source build with your own platform API keys. Same product, your
                infrastructure.
              </p>
            </div>
            <a
              href="https://github.com/postbasehq"
              className="ml-auto rounded-full border border-line px-5 py-2.5 font-display text-sm font-semibold text-blue-ink hover:bg-surface-2"
            >
              View on GitHub
            </a>
          </div>
          <p className="mt-4 text-center text-[12.5px] text-muted">
            Launch pricing — may change before general availability. Prices exclude tax.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1120px] px-6">
        <div
          className="mb-16 overflow-hidden rounded-3xl p-12 text-center text-on-blue"
          style={{
            background:
              "radial-gradient(120% 140% at 0% 0%, #4a6bff, transparent 60%), radial-gradient(120% 140% at 100% 100%, #c0492f, transparent 55%), var(--blue)",
          }}
        >
          <h2 className="font-display text-[clamp(28px,3.8vw,42px)] font-semibold text-on-blue">
            Put your posting on rails.
          </h2>
          <p className="mx-auto mt-3 max-w-[46ch] text-[17px] opacity-90">
            Schedule across every network — from a dashboard, or from your AI.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-full bg-surface px-6 py-3 font-display text-[15px] font-semibold text-blue-ink shadow-sm"
          >
            Start your 7-day trial
          </a>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
