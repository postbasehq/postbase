import { AI_IMAGE_LIMIT, AI_VIDEO_LIMIT, PLAN_ORDER, PLANS } from "@/lib/plans";
import { Tile, MonthShot, AgentShot } from "@/components/marketing/CreatorGrid";
import { McpShot } from "@/components/marketing/DevGrid";
import { Heading, FaqList, wrap } from "@/components/marketing/ui";
import { BrandTile } from "@/components/BrandTile";
import { SubmitButton } from "@/components/SubmitButton";

/** Real product shots of what every plan gets (same tiles as the homepage). */
export function IncludedGrid() {
  return (
    <section className={`${wrap} pt-28 md:pt-36`}>
      <Heading
        title="Included in every plan"
        sub="The plans differ in workspaces, channels, people and AI allowances. The product is the same."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-5">
        <Tile
          className="md:col-span-3"
          tone="blue"
          layout="top"
          label="Calendar"
          title="Plan the whole month in one place"
          body="Every draft, scheduled and published post in a month, week or day view, across all your channels."
        >
          <MonthShot />
        </Tile>
        <Tile
          className="md:col-span-2"
          tone="amber"
          layout="bottom"
          label="AI agent"
          title="Describe a post. The agent writes it."
          body="It checks your channels, writes a version for each network and lines it up for the time you asked. Nothing goes out until you approve it."
        >
          <div className="pt-16">
            <AgentShot />
          </div>
        </Tile>
        <Tile
          className="md:col-span-5"
          tone="red"
          layout="side"
          label="MCP server"
          title="Post from Claude, Cursor and your AI tools"
          body="Connect the hosted MCP server and your AI tool can list your channels, schedule posts and threads, check the queue and cancel posts."
        >
          <McpShot />
        </Tile>
      </div>
    </section>
  );
}

type Cell = string | boolean;
const n = (x: number) => x.toLocaleString("en-US");
const all = (v: Cell): Cell[] => PLAN_ORDER.map(() => v);
const per = (f: (id: (typeof PLAN_ORDER)[number]) => Cell): Cell[] => PLAN_ORDER.map(f);

const LIVE = ["x", "linkedin", "tiktok", "youtube", "bluesky", "mastodon"];

type Row = { label: string; note?: string; networks?: boolean; values: Cell[] };
const teamOnly = per((id) => id !== "creator");

// Only shipped features: every row must be true of the product today.
const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "Essentials",
    rows: [
      { label: "Workspaces", note: "A separate calendar, channels and media per client or brand, on one bill", values: per((id) => n(PLANS[id].workspaces)) },
      { label: "Social channels", note: "Each connected account counts as one, across your workspaces", values: per((id) => n(PLANS[id].channels)) },
      { label: "People", note: "Across your workspaces", values: per((id) => n(PLANS[id].seats)) },
      { label: "Posts, threads and video", note: "Under our fair use policy", values: all("Unlimited") },
      { label: "Networks", networks: true, values: all(true) },
    ],
  },
  {
    title: "Publishing",
    rows: [
      { label: "Post to every network at once", values: all(true) },
      { label: "A version of each post per network", note: "Different wording for LinkedIn and X", values: all(true) },
      { label: "Threads", note: "On X, Bluesky and Mastodon; the first comment on LinkedIn", values: all(true) },
      { label: "Repeating posts", note: "Every day, every few days, weekly or monthly", values: all(true) },
      { label: "Republish a published post", values: all(true) },
      { label: "TikTok and YouTube post settings", note: "Visibility, comments, duets and stitches", values: all(true) },
      { label: "Automatic retries and failure alerts", values: all(true) },
    ],
  },
  {
    title: "Planning",
    rows: [
      { label: "Calendar with month, week and day views", values: all(true) },
      { label: "Drafts", values: all(true) },
      { label: "Queue with search and filters", values: all(true) },
      { label: "Media library", note: "Images and video up to 1 GB", values: all(true) },
      { label: "Post analytics", values: all(true) },
    ],
  },
  {
    title: "Team",
    rows: [
      { label: "Invite teammates", values: teamOnly },
      { label: "Shared calendar, drafts and channels", values: teamOnly },
    ],
  },
  {
    title: "AI",
    rows: [
      { label: "AI agent", note: "Writes and schedules posts from a chat, under our fair use policy", values: all("Unlimited") },
      { label: "AI images a month", values: per((id) => n(AI_IMAGE_LIMIT[id])) },
      { label: "AI videos a month", values: per((id) => n(AI_VIDEO_LIMIT[id])) },
    ],
  },
  {
    title: "Developers",
    rows: [
      { label: "MCP server", note: "For Claude, Cursor and other AI tools", values: all(true) },
      { label: "REST API with API keys", values: all(true) },
      { label: "Revoke AI tool access any time", values: all(true) },
    ],
  },
  {
    title: "Support",
    rows: [
      { label: "Email support", values: all(true) },
      { label: "Priority email support", values: per((id) => id === "growth" || id === "agency") },
    ],
  },
];

function Yes() {
  return (
    <svg className="mx-auto" width="20" height="20" viewBox="0 0 18 18" role="img" aria-label="Included">
      <circle cx="9" cy="9" r="9" fill="#2b59d9" />
      <path d="m5.2 9.3 2.5 2.5 5-5.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function No() {
  return (
    <span className="mx-auto block h-[2px] w-3 rounded-full bg-line" role="img" aria-label="Not included" />
  );
}

const FEATURED = "team";

/**
 * Every limit side by side, grouped, with the featured plan outlined. On the
 * Billing page (`billing`) it sits in the app: no marketing section spacing,
 * and each column's button starts checkout or a switch, like the plan cards.
 */
export function CompareTable({
  billing,
}: {
  billing?: { currentPlan: string | null; action: (formData: FormData) => Promise<void> };
} = {}) {
  // The featured column is outlined in brand blue: side borders on every cell,
  // plus a top cap on the header and a bottom cap on the last row.
  const col = (id: string, edge: "top" | "mid" | "bottom" = "mid") =>
    id !== FEATURED
      ? ""
      : `border-x-2 border-x-[#2b59d9] ${edge === "top" ? "rounded-t-2xl border-t-2 border-t-[#2b59d9]" : ""} ${
          edge === "bottom" ? "rounded-b-2xl border-b-2 border-b-[#2b59d9]" : ""
        }`;
  const lastGroup = GROUPS.length - 1;

  return (
    <section id="compare" className={billing ? "scroll-mt-6" : `${wrap} scroll-mt-28 pt-28 md:pt-36`}>
      {billing ? (
        <h2 className="mb-6 font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">Compare plans</h2>
      ) : (
        <Heading title="Compare plans" sub="Every limit, side by side." />
      )}
      <div className="overflow-x-auto pt-4">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-[14px]">
          <colgroup>
            <col className="w-[28%]" />
            {PLAN_ORDER.map((id) => (
              <col key={id} className="w-[18%]" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="align-bottom pb-6 pr-4">
                <span className="text-[13px] font-medium text-muted">Prices include tax. 7 days free on every plan.</span>
              </th>
              {PLAN_ORDER.map((id) => {
                const p = PLANS[id];
                const featured = id === FEATURED;
                const btn = `rounded-full px-4 py-2.5 font-display text-[13px] font-semibold transition-shadow ${
                  featured
                    ? "bg-[#2b59d9] text-white shadow-sm hover:shadow-md"
                    : "border border-[#e4e6eb] bg-white text-[#14161a] shadow-sm hover:border-[#14161a]"
                }`;
                return (
                  <th key={id} className={`relative px-4 pb-6 pt-7 text-center align-bottom font-normal ${col(id, "top")}`}>
                    {featured ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2b59d9] px-3 py-1 text-[11px] font-semibold text-white">
                        Recommended
                      </span>
                    ) : null}
                    <div className="font-display text-[20px] font-semibold text-ink">{p.name}</div>
                    <div className="mt-2 flex items-end justify-center gap-1">
                      <span className="font-display text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">
                        ${p.monthly}
                      </span>
                      <span className="pb-0.5 text-[13px] text-muted">/month</span>
                    </div>
                    <div className="mt-1 text-[12px] text-muted">or ${p.monthly * 10} a year</div>
                    {billing ? (
                      <form action={billing.action} className="mt-4">
                        <input type="hidden" name="plan" value={id} />
                        <input type="hidden" name="interval" value="month" />
                        <SubmitButton
                          disabled={billing.currentPlan === id}
                          pendingLabel="Opening…"
                          className={`${btn} w-full max-w-[180px] disabled:cursor-default disabled:opacity-60`}
                        >
                          {billing.currentPlan === id
                            ? "Current plan"
                            : billing.currentPlan
                              ? `Switch to ${p.name}`
                              : "Start free trial"}
                        </SubmitButton>
                      </form>
                    ) : (
                      <a href={`/billing?plan=${id}&interval=month`} className={`mt-4 inline-block w-full max-w-[180px] ${btn}`}>
                        Start free trial
                      </a>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          {GROUPS.map((g, gi) => (
            <tbody key={g.title}>
              <tr>
                <th
                  scope="rowgroup"
                  className="border-b border-b-line pb-3 pt-9 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted"
                >
                  {g.title}
                </th>
                {PLAN_ORDER.map((id) => (
                  <td key={id} className={`border-b border-b-line ${col(id)}`} />
                ))}
              </tr>
              {g.rows.map((r, ri) => {
                const last = gi === lastGroup && ri === g.rows.length - 1;
                return (
                  <tr key={r.label} className="group">
                    <th scope="row" className={`py-4 pr-4 font-normal ${last ? "" : "border-b border-b-line"}`}>
                      <div className="text-[15px] text-ink">{r.label}</div>
                      {r.note ? <div className="mt-0.5 text-[12px] text-muted">{r.note}</div> : null}
                      {r.networks ? (
                        <div className="mt-2 flex gap-1.5">
                          {LIVE.map((net) => (
                            <BrandTile key={net} platform={net} size={20} radius={5} />
                          ))}
                        </div>
                      ) : null}
                    </th>
                    {r.values.map((v, j) => {
                      const id = PLAN_ORDER[j];
                      return (
                        <td
                          key={id}
                          className={`px-4 py-4 text-center ${last ? "" : "border-b border-b-line"} ${col(id, last ? "bottom" : "mid")}`}
                        >
                          {v === true ? (
                            <Yes />
                          ) : v === false ? (
                            <No />
                          ) : (
                            <span className="font-display text-[16px] font-semibold text-ink">{v}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

export const PRICING_FAQ: [string, string][] = [
  [
    "How does the free trial work?",
    "Every plan starts with 7 days free. A card is required, but nothing is charged today. If you don't cancel before the trial ends, your plan starts and you're billed for the first month or year.",
  ],
  [
    "Is posting really unlimited?",
    "Yes, for normal use by the people and accounts on your plan. Some networks charge us for every post (X, for example), so if a plan's posting is far beyond typical use, such as automated bulk posting, we'll contact you before anything changes. The details are in our terms.",
  ],
  [
    "What counts as a channel?",
    "Each connected social account is one channel. One X account and one LinkedIn profile, for example, count as two.",
  ],
  [
    "What's a workspace?",
    "A separate space for one client or brand, with its own channels, calendar, media and team, and you switch between them from the sidebar. Creator includes 1, Team 3, Pro 5 and Agency 20, all on one bill. Channels, people and AI allowances are shared across them, so you can give a big client more channels and a small one fewer.",
  ],
  [
    "Who counts as a person?",
    "Everyone across your workspaces, including invites that haven't been accepted yet. Someone in three of your workspaces counts once. Creator is for one person; Team allows 5, Pro 15 and Agency 30.",
  ],
  [
    "Which plan is right for an agency?",
    "Agency, if you manage more than five clients: 20 workspaces, 100 channels and 30 people for $99/month. With five clients or fewer, Pro covers 5 workspaces and 50 channels for $59/month.",
  ],
  [
    "Can I change plans later?",
    "Yes. Switch plan or billing period any time from the Billing page in the app.",
  ],
  [
    "Do prices include tax?",
    "Yes. Prices are in US dollars and include any sales tax or VAT. Checkout can show the price in your local currency.",
  ],
  [
    "Is the AI agent really unlimited?",
    "Yes, for normal use on every plan. There's a daily safety limit per workspace to stop scripts or runaway sessions, far above what anyone uses by hand. AI images and videos have monthly allowances that reset on the 1st; the usage ring in the agent chat shows how much is left.",
  ],
  [
    "How do I cancel?",
    "From the Billing page, any time. You keep access until the end of the period you've paid for.",
  ],
  [
    "Can I run Postbase myself instead?",
    "Yes. Postbase is open source, so you can self-host it for free with your own platform API keys. The plans here are for the hosted version.",
  ],
];

export function PricingFaq() {
  return (
    <section className={`${wrap} pt-28 md:pt-36`}>
      <Heading title="Questions about pricing" />
      <FaqList items={PRICING_FAQ} />
    </section>
  );
}
