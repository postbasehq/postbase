import { MCP_TOOLS, MCP_URL } from "@/lib/seo/mcp";
import type { FactUi } from "@/lib/seo/networks";
import { LogoMark } from "@/components/marketing/Decor";
import { FactUI } from "@/components/marketing/seo/FactUI";
import { card } from "@/components/marketing/ui";

/*
 * Cards for the MCP pages, in the pricing PlanCard's two-zone style: an inset
 * panel (name and a solid label), then the detail.
 */

function TwoZone({
  head,
  label,
  labelClass,
  preview,
  children,
}: {
  head: React.ReactNode;
  label: string;
  labelClass: string;
  /** Shown under the heading inside the inset panel. */
  preview?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[22px] border border-line bg-surface p-2 shadow-sm">
      <div className="rounded-2xl border border-line bg-surface-2 p-5">
        <div className="flex items-center justify-between gap-3">
          {head}
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${labelClass}`}>{label}</span>
        </div>
        {preview ? <div className="mt-4">{preview}</div> : null}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">{children}</div>
    </div>
  );
}

const CALL_LABEL: Record<string, string> = {
  list_channels: "List channels",
  create_post: "Create or schedule a post",
  get_post: "Get a post",
  update_post: "Edit a post",
  retry_post: "Retry failed channels",
  list_media: "List media",
  add_media: "Add media from a URL",
  list_scheduled: "List scheduled posts",
  cancel_post: "Cancel a scheduled post",
};

/** The tool call as it shows in Claude, as in the hero demo (McpDemo). */
function CallRow({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-[#1f1f1e] px-3 py-2.5 text-[13px] ring-1 ring-[#3a3a37]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/postbase-icon.png" alt="" className="size-[18px] rounded-[5px]" />
      <span className="font-medium text-[#ecebe8]">{CALL_LABEL[name] ?? name}</span>
      <span className="text-[#7c7a75]">Postbase</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c7a75" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="ml-auto" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
  );
}

/** The server's tools: name, read or write, how the call looks in Claude, what it does and its arguments. */
export function McpTools() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {MCP_TOOLS.map((t) => (
        <TwoZone
          key={t.name}
          head={<code className="font-mono text-[17px] font-semibold text-ink">{t.name}</code>}
          label={t.kind === "read" ? "Read only" : "Writes"}
          labelClass={t.kind === "read" ? "border border-line bg-surface text-ink" : "bg-[#2b59d9] text-white"}
          preview={<CallRow name={t.name} />}
        >
          <p className="text-[15px] leading-relaxed text-ink">{t.summary}</p>
          <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{t.args}</p>
        </TwoZone>
      ))}
    </div>
  );
}

/** Hosted with OAuth, or local with an API key. */
export function McpConnect() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <TwoZone
        head={<h3 className="font-display text-[20px] font-semibold text-ink">Hosted</h3>}
        label="Recommended"
        labelClass="bg-[#2b59d9] text-white"
      >
        <p className="text-[15px] leading-relaxed text-ink">
          Paste the server URL into Claude, ChatGPT, Cursor or any client that supports remote servers, then sign in with Postbase. No key to copy or store.
        </p>
        <p className="mt-4 w-fit rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-[14px] text-ink">{MCP_URL}</p>
      </TwoZone>
      <TwoZone
        head={<h3 className="font-display text-[20px] font-semibold text-ink">Local</h3>}
        label="API key"
        labelClass="bg-[#e3a72c] text-[#14161a]"
      >
        <p className="text-[15px] leading-relaxed text-ink">
          For clients that only run local servers: create a key on the AI &amp; API page and run the open-source package with npx. Same tools.
        </p>
        <p className="mt-4 w-fit rounded-xl border border-line bg-surface-2 px-3.5 py-2 font-mono text-[14px] text-ink">npx @postbasehq/mcp</p>
      </TwoZone>
    </div>
  );
}

const TONE = {
  blue: { bg: "#2b59d9", ink: "#ffffff", mark: "#2148b3" },
  amber: { bg: "#e3a72c", ink: "#14161a", mark: "#c98e17" },
  red: { bg: "#d14a3e", ink: "#ffffff", mark: "#b23a2f" },
} as const;

/** The server at a glance: solid brand tiles, the Postbase mark as texture, the key fact big. */
export function GlanceTiles({ items }: { items: { label: string; stat: string; value: string; tone: keyof typeof TONE }[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {items.map((f) => {
        const t = TONE[f.tone];
        return (
          <div key={f.label} className="relative isolate flex min-h-[230px] flex-col overflow-hidden rounded-[24px] p-8" style={{ background: t.bg }}>
            <LogoMark color={t.mark} edge="top" className="pointer-events-none absolute right-6 top-0 -z-10 w-[104px]" />
            <span className="self-start rounded-full bg-white px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-[#14161a]">
              {f.label}
            </span>
            <p className="mt-5 font-display text-[clamp(26px,2.6vw,34px)] font-semibold leading-[1.05] tracking-[-0.03em]" style={{ color: t.ink }}>
              {f.stat}
            </p>
            <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed" style={{ color: t.ink }}>
              {f.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** How create_post behaves on one network: a product preview on top, the fact underneath. */
export function McpFacts({ network, items }: { network: string; items: { label: string; stat: string; ui: FactUi; value: string }[] }) {
  return (
    <dl className={`grid gap-4 sm:grid-cols-2 ${items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
      {items.map((f) => (
        <div key={f.label} className={`${card} flex flex-col overflow-hidden`}>
          <div className="flex min-h-[170px] items-center border-b border-line bg-surface-2 p-5">
            <FactUI ui={f.ui} network={network} />
          </div>
          <div className="flex flex-1 flex-col p-6">
            <dt className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{f.label}</dt>
            <dd className="mt-3 font-display text-[clamp(24px,2.2vw,30px)] font-semibold leading-none tracking-[-0.03em] text-ink">{f.stat}</dd>
            <dd className="mt-2.5 text-[14px] leading-snug text-muted">{f.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/**
 * A solid Postbase-blue panel: a white badge, a big white heading and white cards
 * inside. Items without a label are numbered.
 */
export function BluePanel({ badge, title, items }: { badge: string; title: string; items: { label?: string; value: string }[] }) {
  return (
    <div className="relative isolate overflow-hidden rounded-[24px] bg-[#2b59d9] p-8 md:p-10">
      <LogoMark color="#2148b3" edge="top" className="pointer-events-none absolute right-10 top-0 -z-10 w-[150px]" />
      <span className="rounded-full bg-white px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-[#14161a]">
        {badge}
      </span>
      <h3 className="mt-5 max-w-[24ch] font-display text-[clamp(26px,3vw,38px)] font-semibold leading-[1.08] tracking-[-0.02em] text-white">{title}</h3>
      <dl className="mt-7 grid gap-5 md:grid-cols-3">
        {items.map((c, i) => (
          <div key={c.label ?? c.value} className="rounded-2xl bg-white p-5">
            <dt className="font-display text-[15px] font-semibold text-[#14161a]">
              {c.label ?? (
                <span className="flex size-7 items-center justify-center rounded-full bg-[#2b59d9] text-[13px] text-white">{i + 1}</span>
              )}
            </dt>
            <dd className="mt-2 text-[14px] leading-relaxed text-[#3d4048]">{c.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** What create_post refuses or flags. */
export function ChecksPanel({ items }: { items: { label: string; value: string }[] }) {
  return <BluePanel badge="Checked first" title="Problems go back to the agent, not out to your followers" items={items} />;
}
