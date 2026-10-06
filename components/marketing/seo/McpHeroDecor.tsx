import { BrandTile } from "@/components/BrandTile";
import { ClientLogo } from "@/components/ClientLogo";

/*
 * The /mcp hero backdrop: two tilted clusters of product widgets coming out of
 * the page edges beside the headline, layered with depth. Left, the AI side:
 * the month on the Postbase calendar, Claude scheduling through Postbase, a
 * Claude tile. Right, the Postbase side: the day's posts, the connected apps
 * list, a Postbase tile. Only the networks the MCP server posts to (X,
 * LinkedIn, Bluesky, Mastodon); no photos. Each side stays within ~20vw, clear
 * of the centred copy; wide screens only.
 */

const shadow = "shadow-[0_30px_70px_-30px_rgba(16,24,40,0.55)]";
const card = `rounded-[22px] border border-line bg-surface ${shadow}`;

/** September 2026 on the Postbase calendar, the 24th picked. */
function MonthWidget() {
  // 1 Sep 2026 is a Tuesday: one blank before it in a Monday-first week.
  const days = [null, ...Array.from({ length: 30 }, (_, i) => i + 1)];
  const dots: Record<number, string> = { 17: "#e3a72c", 21: "#2b59d9", 23: "#d14a3e", 25: "#2b59d9", 28: "#e3a72c" };
  return (
    <div className={`${card} w-[300px] p-5`}>
      <div className="flex items-center justify-between">
        <span className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">September 2026</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-y-2 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[11px] font-semibold text-muted">
            {d}
          </span>
        ))}
        {days.map((d, i) => (
          <span key={i} className="flex flex-col items-center">
            {d ? (
              <span
                className={`grid size-8 place-items-center rounded-full text-[13px] font-medium tabular-nums ${
                  d === 24 ? "bg-[#2b59d9] font-semibold text-white" : "text-ink"
                }`}
              >
                {d}
              </span>
            ) : (
              <span className="size-8" />
            )}
            <span className="mt-0.5 size-1 rounded-full" style={{ background: d && dots[d] ? dots[d] : "transparent" }} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Claude (desktop app, dark) scheduling through Postbase. */
function ClaudeCard() {
  return (
    <div className={`w-[290px] overflow-hidden rounded-[20px] bg-[#262624] ring-1 ring-black/40 ${shadow}`}>
      <div className="flex flex-col gap-2.5 p-4">
        <p className="ml-auto max-w-[90%] rounded-2xl bg-[#3a3a37] px-3.5 py-2 text-[13px] leading-snug text-[#ecebe8]">
          Thread our launch notes for X and Bluesky, 9am tomorrow
        </p>
        <div className="flex items-center gap-2.5 rounded-xl border border-[#3a3a37] bg-[#1f1f1e] px-3 py-2 text-[12.5px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/postbase-icon.png" alt="" className="size-4 rounded-[4px]" />
          <span className="font-medium text-[#ecebe8]">Create or schedule a post</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-[#7c7a75]">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#1f1f1e] px-3 py-2.5 ring-1 ring-[#3a3a37]">
          <span className="flex -space-x-1">
            {["x", "bluesky"].map((c) => (
              <span key={c} className="rounded-[5px] ring-2 ring-[#1f1f1e]">
                <BrandTile platform={c} size={20} radius={5} />
              </span>
            ))}
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-[#ecebe8]">Thread, 3 posts</span>
            <span className="block text-[12px] text-[#a8a6a1]">Scheduled · Thu 24 Sep, 09:00</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** A Thursday on the Postbase calendar: the day's posts by time. */
function DayWidget() {
  const row = (time: string, chans: string[]) => (
    <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3.5">
      <span className="font-display text-[19px] font-medium tabular-nums text-ink">{time}</span>
      <span className="flex -space-x-1.5">
        {chans.map((c) => (
          <span key={c} className="rounded-[9px] ring-[3px] ring-surface-2">
            <BrandTile platform={c} size={32} radius={8} />
          </span>
        ))}
      </span>
    </div>
  );
  return (
    <div className={`${card} w-[300px] p-2.5`}>
      <div className="rounded-2xl bg-[#2b59d9] py-3 text-center font-display text-[22px] font-semibold text-white">Thu 24</div>
      <div className="mt-2.5 flex flex-col gap-2">
        {row("09:00", ["x", "bluesky"])}
        {row("11:30", ["linkedin"])}
        {row("15:00", ["mastodon"])}
      </div>
    </div>
  );
}

/** Settings → AI & API, Connected apps (components/DeveloperClient). */
function ConnectedApps() {
  const row = (id: string, name: string, meta: string) => (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-black/5">
        <ClientLogo id={id} size={22} bare />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-ink">{name}</span>
        <span className="block truncate text-[12px] text-muted">{meta}</span>
      </span>
    </div>
  );
  return (
    <div className={`${card} w-[290px] p-4`}>
      <span className="px-1 font-display text-[16px] font-semibold text-ink">Connected apps</span>
      <div className="mt-3 flex flex-col gap-2">
        {row("claude", "Claude", "last used now")}
        {row("cursor", "Cursor", "last used yesterday")}
      </div>
    </div>
  );
}

/** A small square app tile, like an app icon. */
function AppTile({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`grid size-[84px] place-items-center rounded-[24px] ${dark ? "bg-[#262624] ring-1 ring-black/40" : "border border-line bg-surface"} ${shadow}`}>
      {children}
    </span>
  );
}

export function McpHeroDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[760px] overflow-hidden select-none xl:block">
      {/* Left cluster: the AI side, tilted left, coming out of the edge */}
      <div className="absolute left-0 top-[96px] h-[500px] w-[20vw]">
        <div className="absolute right-[12px] top-0 -rotate-[8deg]">
          <MonthWidget />
        </div>
        <div className="absolute right-[-26px] top-[232px] -rotate-[5deg]">
          <ClaudeCard />
        </div>
        <div className="absolute right-[196px] top-[330px] -rotate-[10deg]">
          <AppTile dark>
            <ClientLogo id="claude" size={40} bare />
          </AppTile>
        </div>
      </div>

      {/* Right cluster: the Postbase side, tilted right */}
      <div className="absolute right-0 top-[72px] h-[520px] w-[20vw]">
        <div className="absolute left-[40px] top-0 rotate-[7deg]">
          <ConnectedApps />
        </div>
        <div className="absolute left-[-4px] top-[176px] rotate-[-4deg]">
          <DayWidget />
        </div>
        <div className="absolute left-[200px] top-[392px] rotate-[9deg]">
          <AppTile>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/postbase-icon.png" alt="" className="size-12 rounded-xl" />
          </AppTile>
        </div>
      </div>
    </div>
  );
}
