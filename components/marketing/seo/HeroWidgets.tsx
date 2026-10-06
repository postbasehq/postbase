import { BrandTile } from "@/components/BrandTile";
import { ClientLogo } from "@/components/ClientLogo";

/*
 * Hero backdrops for the AI pages (/mcp, /ai): two tilted clusters of product
 * widgets coming out of the page edges beside the headline, layered with
 * depth. Left is the AI side (Claude calling Postbase, the Postbase sign-in),
 * right is the Postbase side (the calendar, connected apps). Only the networks
 * the MCP server posts to (X, LinkedIn, Bluesky, Mastodon); no photos. Each
 * side stays within ~20vw, clear of the centred copy; 1280px and wider.
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

function Tick() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-[#7c7a75]">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Claude (desktop app, dark) calling one of Postbase's tools, and what came back. */
function ClaudeCard({ ask, tool, children }: { ask: string; tool: string; children: React.ReactNode }) {
  return (
    <div className={`w-[290px] overflow-hidden rounded-[20px] bg-[#262624] ring-1 ring-black/40 ${shadow}`}>
      <div className="flex flex-col gap-2.5 p-4">
        <p className="ml-auto max-w-[90%] rounded-2xl bg-[#3a3a37] px-3.5 py-2 text-[13px] leading-snug text-[#ecebe8]">{ask}</p>
        <div className="flex items-center gap-2.5 rounded-xl border border-[#3a3a37] bg-[#1f1f1e] px-3 py-2 text-[12.5px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/postbase-icon.png" alt="" className="size-4 rounded-[4px]" />
          <span className="font-medium text-[#ecebe8]">{tool}</span>
          <Tick />
        </div>
        {children}
      </div>
    </div>
  );
}

/** A post in Claude's reply: its networks, what it is, when. */
function ClaudePost({ chans, what, when }: { chans: string[]; what: string; when: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#1f1f1e] px-3 py-2.5 ring-1 ring-[#3a3a37]">
      <span className="flex -space-x-1">
        {chans.map((c) => (
          <span key={c} className="rounded-[5px] ring-2 ring-[#1f1f1e]">
            <BrandTile platform={c} size={20} radius={5} />
          </span>
        ))}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-[#ecebe8]">{what}</span>
        <span className="block text-[12px] text-[#a8a6a1]">{when}</span>
      </span>
    </div>
  );
}

/** The Postbase sign-in an AI tool asks for (app/oauth/authorize). */
function ConsentCard({ app }: { app: { id: string; name: string } }) {
  return (
    <div className={`${card} w-[290px] p-5`}>
      <div className="flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-xl bg-white ring-1 ring-black/5">
          <ClientLogo id={app.id} size={22} bare />
        </span>
        <span className="flex gap-1">
          <span className="size-1 rounded-full bg-line" />
          <span className="size-1 rounded-full bg-line" />
          <span className="size-1 rounded-full bg-line" />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/postbase-icon.png" alt="" className="size-10 rounded-xl" />
      </div>
      <p className="mt-4 font-display text-[18px] font-semibold leading-tight tracking-[-0.02em] text-ink">{app.name} wants to connect to Postbase</p>
      <p className="mt-3 text-[12px] font-semibold text-ink">{app.name} will be able to:</p>
      <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-ink">
        <li>See your connected channels</li>
        <li>Draft and schedule posts</li>
      </ul>
      <div className="mt-4 flex gap-2">
        <span className="flex h-10 flex-1 items-center justify-center rounded-full border border-line text-[13px] font-semibold text-ink">Deny</span>
        <span className="flex h-10 flex-1 items-center justify-center rounded-full bg-[#2b59d9] font-display text-[13px] font-semibold text-white">Authorize</span>
      </div>
    </div>
  );
}

/** A day on the Postbase calendar: its posts by time. */
function DayWidget({ day, rows }: { day: string; rows: [string, string[]][] }) {
  return (
    <div className={`${card} w-[300px] p-2.5`}>
      <div className="rounded-2xl bg-[#2b59d9] py-3 text-center font-display text-[22px] font-semibold text-white">{day}</div>
      <div className="mt-2.5 flex flex-col gap-2">
        {rows.map(([time, chans]) => (
          <div key={time} className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3.5">
            <span className="font-display text-[19px] font-medium tabular-nums text-ink">{time}</span>
            <span className="flex -space-x-1.5">
              {chans.map((c) => (
                <span key={c} className="rounded-[9px] ring-[3px] ring-surface-2">
                  <BrandTile platform={c} size={32} radius={8} />
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Settings → AI & API, Connected apps (components/DeveloperClient). */
function ConnectedApps({ apps }: { apps: [string, string, string][] }) {
  return (
    <div className={`${card} w-[290px] p-4`}>
      <span className="px-1 font-display text-[16px] font-semibold text-ink">Connected apps</span>
      <div className="mt-3 flex flex-col gap-2">
        {apps.map(([id, name, meta]) => (
          <div key={id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-black/5">
              <ClientLogo id={id} size={22} bare />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-ink">{name}</span>
              <span className="block truncate text-[12px] text-muted">{meta}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A small square app tile, like an app icon. */
function AppTile({ children, tone = "surface" }: { children: React.ReactNode; tone?: "surface" | "claude" | "white" }) {
  const look =
    tone === "claude" ? "bg-[#262624] ring-1 ring-black/40" : tone === "white" ? "bg-white ring-1 ring-black/5" : "border border-line bg-surface";
  return <span className={`grid size-[84px] place-items-center rounded-[24px] ${look} ${shadow}`}>{children}</span>;
}

function PostbaseMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/postbase-icon.png" alt="" className="size-12 rounded-xl" />;
}

const frame = "pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[760px] overflow-hidden select-none xl:block";

/** /mcp: the month and Claude scheduling on the left; connected apps and the day's posts on the right. */
export function McpHeroDecor() {
  return (
    <div aria-hidden className={frame}>
      <div className="absolute left-0 top-[96px] h-[500px] w-[20vw]">
        <div className="absolute right-[12px] top-0 -rotate-[8deg]">
          <MonthWidget />
        </div>
        <div className="absolute right-[-26px] top-[232px] -rotate-[5deg]">
          <ClaudeCard ask="Thread our launch notes for X and Bluesky, 9am tomorrow" tool="Create or schedule a post">
            <ClaudePost chans={["x", "bluesky"]} what="Thread, 3 posts" when="Scheduled · Thu 24 Sep, 09:00" />
          </ClaudeCard>
        </div>
        <div className="absolute right-[196px] top-[330px] -rotate-[10deg]">
          <AppTile tone="claude">
            <ClientLogo id="claude" size={40} bare />
          </AppTile>
        </div>
      </div>
      <div className="absolute right-0 top-[72px] h-[520px] w-[20vw]">
        <div className="absolute left-[40px] top-0 rotate-[7deg]">
          <ConnectedApps
            apps={[
              ["claude", "Claude", "last used now"],
              ["cursor", "Cursor", "last used yesterday"],
            ]}
          />
        </div>
        <div className="absolute left-[-4px] top-[176px] rotate-[-4deg]">
          <DayWidget
            day="Thu 24"
            rows={[
              ["09:00", ["x", "bluesky"]],
              ["11:30", ["linkedin"]],
              ["15:00", ["mastodon"]],
            ]}
          />
        </div>
        <div className="absolute left-[200px] top-[392px] rotate-[9deg]">
          <AppTile>
            <PostbaseMark />
          </AppTile>
        </div>
      </div>
    </div>
  );
}

/**
 * /ai, following its three steps: sign in to Postbase and ask for posts on the
 * left (the sign-in, Claude reading the week back); what landed on the
 * calendar and who's connected on the right.
 */
export function AiHeroDecor() {
  return (
    <div aria-hidden className={frame}>
      <div className="absolute left-0 top-[56px] h-[520px] w-[20vw]">
        <div className="absolute right-[18px] top-0 -rotate-[7deg]">
          <ConsentCard app={{ id: "claude", name: "Claude" }} />
        </div>
        <div className="absolute right-[-30px] top-[250px] -rotate-[4deg]">
          <ClaudeCard ask="What's going out this week?" tool="List scheduled posts">
            <ClaudePost chans={["linkedin"]} what="Hiring post" when="Wed 23 Sep, 11:30" />
            <ClaudePost chans={["x", "bluesky"]} what="Launch thread" when="Thu 24 Sep, 09:00" />
          </ClaudeCard>
        </div>
        <div className="absolute right-[200px] top-[350px] -rotate-[10deg]">
          <AppTile tone="white">
            <ClientLogo id="chatgpt" size={42} bare />
          </AppTile>
        </div>
      </div>
      <div className="absolute right-0 top-[56px] h-[520px] w-[20vw]">
        <div className="absolute left-[-2px] top-0 rotate-[6deg]">
          <DayWidget
            day="Fri 25"
            rows={[
              ["08:30", ["linkedin"]],
              ["12:00", ["x", "mastodon"]],
              ["17:15", ["bluesky"]],
            ]}
          />
        </div>
        <div className="absolute left-[40px] top-[276px] -rotate-[5deg]">
          <ConnectedApps
            apps={[
              ["claude", "Claude", "last used now"],
              ["gemini", "Gemini CLI", "last used today"],
            ]}
          />
        </div>
        <div className="absolute left-[196px] top-[226px] rotate-[10deg]">
          <AppTile tone="white">
            <ClientLogo id="cursor" size={40} bare />
          </AppTile>
        </div>
      </div>
    </div>
  );
}

/** Above the headline on the AI pages: the AI tools that connect, as app tiles. */
export function ClientIconRow() {
  const clients = [
    ["claude", "Claude"],
    ["chatgpt", "ChatGPT"],
    ["cursor", "Cursor"],
    ["vscode", "VS Code"],
    ["windsurf", "Windsurf"],
    ["gemini", "Gemini"],
  ];
  return (
    <div className="flex justify-center">
      <span className="sr-only">Works with {clients.map(([, n]) => n).join(", ")}</span>
      <span className="flex items-center -space-x-1.5" aria-hidden>
        {clients.map(([id, name], i) => (
          <span
            key={id}
            title={name}
            className="rounded-md shadow-[0_8px_20px_-10px_rgba(16,24,40,0.55)] ring-[3px] ring-ground"
            style={{ transform: `rotate(${i % 2 ? 6 : -6}deg)` }}
          >
            <ClientLogo id={id} size={40} />
          </span>
        ))}
      </span>
    </div>
  );
}
