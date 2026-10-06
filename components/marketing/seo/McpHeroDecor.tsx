import { BrandTile } from "@/components/BrandTile";
import { ClientLogo } from "@/components/ClientLogo";

/*
 * The /mcp hero backdrop: pieces of the real flow coming out of both sides,
 * overlapping and cut off by the page edges. Left, the AI side: Claude
 * calling Postbase's tools and the Postbase sign-in it asks for. Right, the
 * Postbase side: the post on the calendar and the connected-apps list. Only the networks the MCP server posts to (X, LinkedIn, Bluesky,
 * Mastodon). Each side ends at 19vw, clear of the centred copy; wide screens
 * only.
 */

const card = "rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-28px_rgba(16,24,40,0.5)]";

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c7a75]">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Claude (desktop app, dark) mid-request, as in the demo below. */
function ClaudeFragment() {
  return (
    <div className="overflow-hidden rounded-[18px] bg-[#262624] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] ring-1 ring-black/40">
      <div className="flex items-center gap-3 border-b border-[#3a3a37] px-4 py-3">
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#ecebe8]">
          <ClientLogo id="claude" size={15} bare />
          Claude
        </span>
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <p className="ml-auto max-w-[88%] rounded-2xl bg-[#3a3a37] px-3.5 py-2 text-[13px] leading-snug text-[#ecebe8]">
          Thread our launch notes for X and Bluesky, 9am tomorrow
        </p>
        {["List channels", "Create or schedule a post"].map((t) => (
          <div key={t} className="flex items-center gap-2.5 rounded-xl border border-[#3a3a37] bg-[#1f1f1e] px-3 py-2 text-[12.5px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/postbase-icon.png" alt="" className="size-4 rounded-[4px]" />
            <span className="font-medium text-[#ecebe8]">{t}</span>
            <span className="text-[#7c7a75]">Postbase</span>
            <span className="ml-auto">
              <Check />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The Postbase sign-in Claude asks for (app/oauth/authorize). */
function ConsentFragment() {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-white ring-1 ring-black/5">
          <ClientLogo id="claude" size={20} bare />
        </span>
        <span className="flex gap-1">
          <span className="size-1 rounded-full bg-line" />
          <span className="size-1 rounded-full bg-line" />
          <span className="size-1 rounded-full bg-line" />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/postbase-icon.png" alt="" className="size-9 rounded-xl" />
      </div>
      <p className="mt-4 font-display text-[17px] font-semibold leading-tight tracking-[-0.02em] text-ink">Claude wants to connect to Postbase</p>
      <p className="mt-3 text-[12px] font-semibold text-ink">Claude will be able to:</p>
      <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] text-ink">
        <li>See your connected channels</li>
        <li>Draft and schedule posts</li>
      </ul>
      <div className="mt-4 flex gap-2">
        <span className="flex h-9 flex-1 items-center justify-center rounded-full border border-line text-[13px] font-semibold text-ink">Deny</span>
        <span className="flex h-9 flex-1 items-center justify-center rounded-full bg-[#2b59d9] font-display text-[13px] font-semibold text-white">Authorize</span>
      </div>
    </div>
  );
}

/** Claude's confirmation card once the post is scheduled. */
function ScheduledFragment() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#1f1f1e] px-3.5 py-3 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.8)] ring-1 ring-[#3a3a37]">
      <span className="flex -space-x-1">
        {["x", "bluesky"].map((c) => (
          <span key={c} className="rounded-[5px] ring-2 ring-[#1f1f1e]">
            <BrandTile platform={c} size={20} radius={5} />
          </span>
        ))}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-[#ecebe8]">Thread, 3 posts</span>
        <span className="block text-[12px] text-[#a8a6a1]">Scheduled · Thu 24 Sep, 09:00</span>
      </span>
    </div>
  );
}

/** A day on the Postbase calendar with the post Claude just added. */
function CalendarFragment() {
  const chip = (time: string, chans: string[], text: string, accent: string) => (
    <div className="flex items-center gap-2 rounded-lg border-l-[3px] bg-surface-2 px-2 py-1.5 text-[11.5px]" style={{ borderLeftColor: accent }}>
      <span className="flex -space-x-1">
        {chans.map((c) => (
          <span key={c} className="rounded-[4px] ring-2 ring-surface-2">
            <BrandTile platform={c} size={15} radius={4} />
          </span>
        ))}
      </span>
      <span className="font-medium tabular-nums text-muted">{time}</span>
      <span className="truncate text-ink">{text}</span>
    </div>
  );
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[15px] font-semibold text-ink">Calendar</span>
        <span className="text-[12px] font-medium text-muted">Thu 24 Sep</span>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {chip("09:00", ["x", "bluesky"], "Launch notes, a thread", "#2b59d9")}
        {chip("11:30", ["linkedin"], "We're hiring a designer", "#e3a72c")}
        {chip("15:00", ["mastodon"], "Release 1.4 is out", "#2b59d9")}
      </div>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-[11.5px] font-medium text-ground">
        <ClientLogo id="claude" size={13} bare />
        Scheduled by Claude · Thu 09:00
      </div>
    </div>
  );
}

/** Settings → AI & API, Connected apps (components/DeveloperClient). */
function ConnectedAppsFragment() {
  const row = (name: string, meta: string, last: boolean) => (
    <div className={`flex items-center gap-3 px-4 py-3 ${last ? "" : "border-b border-line"}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{name}</span>
        <span className="block truncate text-[11.5px] text-muted">{meta}</span>
      </span>
      <span className="ml-auto text-[11.5px] font-semibold text-muted">Revoke</span>
    </div>
  );
  return (
    <div className={card}>
      <div className="border-b border-line px-4 py-3">
        <span className="font-display text-[14px] font-semibold text-ink">Connected apps</span>
      </div>
      {row("Claude", "connected today · last used now", false)}
      {row("Cursor", "connected 3 Sep · last used yesterday", true)}
    </div>
  );
}

export function McpHeroDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[700px] overflow-hidden select-none xl:block">
      {/* Left: the AI side */}
      <div className="absolute inset-y-0 left-0 w-[19vw]">
        <div className="absolute right-0 top-[56px] w-[360px]">
          <ClaudeFragment />
        </div>
        <div className="absolute right-[28px] top-[262px] w-[300px]">
          <ConsentFragment />
        </div>
        <div className="absolute right-[-6px] top-[512px] w-[290px]">
          <ScheduledFragment />
        </div>
      </div>

      {/* Right: the Postbase side */}
      <div className="absolute inset-y-0 right-0 w-[19vw]">
        <div className="absolute left-0 top-[40px] w-[360px]">
          <CalendarFragment />
        </div>
        <div className="absolute left-[30px] top-[272px] w-[330px]">
          <ConnectedAppsFragment />
        </div>
      </div>
    </div>
  );
}
