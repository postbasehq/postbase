import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AgentDemo } from "@/components/AgentDemo";

const pill = "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold font-display";

function Dot({ className }: { className: string }) {
  return <span className={`size-2 rounded-full ${className}`} />;
}

export default function Home() {
  return (
    <>
      <SiteNav />

      {/* HERO */}
      <header className="pt-9 md:pt-24">
        <div className="mx-auto flex max-w-[720px] flex-col items-center px-6 text-center">
          <span className={`${pill} bg-blue-soft text-blue-ink`}>
            Open-source · MCP-native
          </span>
          <h1 className="mt-4 font-display text-[clamp(34px,6.4vw,66px)] font-semibold leading-[1.03] tracking-[-0.02em] text-balance md:mt-5">
            Let your AI <span className="text-terra">post for you.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[48ch] text-[17px] text-muted text-balance md:mt-5 md:text-lg">
            The open-source, MCP-native scheduler. Connect Claude, Cursor, or any
            agent — it drafts, schedules, and publishes for you.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 md:mt-8">
            <a
              href="/login"
              className="rounded-full bg-blue px-6 py-3 font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
            >
              Start for $0
            </a>
            <a
              href="https://github.com/postbasehq"
              className="rounded-full border border-line px-6 py-3 font-display text-[15px] font-semibold text-blue-ink transition-colors hover:bg-surface-2"
            >
              ★ Star on GitHub
            </a>
          </div>
          <p className="mt-4 text-[13.5px] text-muted">
            7-day trial · cancel anytime · or <b className="text-ink">self-host for free</b>.
          </p>
        </div>

        {/* live agent demo — full width below the fold-line */}
        <div className="mx-auto mt-7 max-w-[880px] px-6 md:mt-12">
          <AgentDemo />
        </div>

        {/* channels */}
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-3.5 px-6 pb-2 pt-7 text-[13.5px] text-muted">
          <span>Publish to</span>
          <span className="inline-flex items-center gap-2 font-medium"><Dot className="bg-ink" />X</span>
          <span className="inline-flex items-center gap-2 font-medium"><Dot className="bg-blue" />LinkedIn</span>
          <span className="inline-flex items-center gap-2 font-medium"><Dot className="bg-terra" />Instagram</span>
          <span className="inline-flex items-center gap-2 font-medium"><Dot className="bg-ink" />TikTok</span>
          <span className="inline-flex items-center gap-2 font-medium"><Dot className="bg-amber-bright" />YouTube</span>
          <span className="inline-flex items-center gap-2 font-medium"><Dot className="bg-[#0085FF]" />Bluesky</span>
          <span className="inline-flex items-center gap-2 font-medium"><Dot className="bg-[#6364FF]" />Mastodon</span>
        </div>
      </header>

      {/* FEATURES */}
      <section id="features" className="py-16">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="mb-8 max-w-[52ch]">
            <div className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              The rail
            </div>
            <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,36px)] font-semibold leading-tight tracking-[-0.01em]">
              One place to schedule, queue, and publish — reliably.
            </h2>
            <p className="mt-3.5 text-[17px] text-muted">
              Postbase moves your content. Write it (or bring what your AI wrote), pick the
              channels and the time, and it goes out — with the status of every post in
              plain sight.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Schedule everywhere", "Compose once, choose your channels, set a time or a queue slot. Postbase publishes on schedule."],
              ["Per-channel variants", "Tailor the wording for each platform from one post — a thread on X, a cleaner cut on LinkedIn."],
              ["Calendar & queue", "See everything scheduled and published in a calendar and a queue. Edit or cancel before it goes."],
              ["Reliable publishing", "A real scheduling engine runs each post at its time, retries transient failures, and flags what needs you."],
              ["Teams & clients", "Organisations hold many channels — built for agencies managing more than one account."],
              ["Open-source", "The whole thing is open. Use our hosted cloud, or run it yourself with your own keys — free."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="mb-3.5 flex size-9 items-center justify-center rounded-xl bg-blue-soft font-display font-semibold text-blue-ink">
                  ◆
                </div>
                <h3 className="font-display text-[16.5px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEVELOPERS (MCP foregrounded here only) */}
      <section id="developers" className="bg-surface-2 py-16">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="mb-8 max-w-[52ch]">
            <div className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              For developers
            </div>
            <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,36px)] font-semibold leading-tight tracking-[-0.01em]">
              The open-source, MCP-native publishing rail.
            </h2>
            <p className="mt-3.5 text-[17px] text-muted">
              Add the Postbase MCP server to Claude, Cursor, or any MCP client and let your
              agent schedule and publish through the same API the dashboard uses.
            </p>
          </div>
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <pre className="overflow-x-auto rounded-2xl bg-[#1b1e26] p-5 font-mono text-[13px] leading-7 text-[#e6e8ef] shadow-md">
{`# ~/.config/mcp — add Postbase
{
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
                  <span key={t} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[12.5px]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="max-w-[82%] self-end rounded-2xl rounded-br-sm bg-blue px-4 py-2.5 text-sm text-on-blue">
                Schedule this thread for 9am to X and LinkedIn.
              </div>
              <div className="max-w-[82%] self-start rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5 text-sm">
                Done — 3-post thread queued for <b className="text-green">9:00am</b> to X and
                LinkedIn. It’s in your Postbase queue.
              </div>
              <div className="max-w-[82%] self-end rounded-2xl rounded-br-sm bg-blue px-4 py-2.5 text-sm text-on-blue">
                Actually, hold the LinkedIn one.
              </div>
              <div className="max-w-[82%] self-start rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5 text-sm">
                Cancelled the LinkedIn copy. <b className="text-green">X thread still
                scheduled</b> for 9:00am.
              </div>
              <p className="mt-3 text-[13.5px] text-muted">
                Same API behind the dashboard and the MCP server — a human and an agent
                operate the exact same rail.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="mb-8 max-w-[52ch]">
            <div className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Pricing
            </div>
            <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,36px)] font-semibold leading-tight tracking-[-0.01em]">
              Start with a 7-day trial. No free-forever plan.
            </h2>
            <p className="mt-3.5 text-[17px] text-muted">
              Every plan is a full Postbase account. Prefer to run it yourself? Self-hosting
              is free, forever.
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

      {/* CTA */}
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mb-16 rounded-3xl bg-blue p-12 text-center text-on-blue">
          <h2 className="font-display text-[clamp(26px,3.6vw,38px)] font-semibold text-on-blue">
            Put your posting on rails.
          </h2>
          <p className="mx-auto mt-3 max-w-[44ch] text-[17px] opacity-90">
            Schedule across X, LinkedIn, Instagram, TikTok, YouTube, Bluesky, and Mastodon — from a dashboard, or from your AI.
          </p>
          <a
            href="#pricing"
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
