"use client";

import { Fit } from "@/components/marketing/Fit";
import { ComposerShot } from "@/components/marketing/ComposerShot";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";
import { DevShot } from "@/components/marketing/DevShot";
import { AgentShot, Tile } from "@/components/marketing/CreatorGrid";
import { McpShot, RevokeShot, ToolsShot } from "@/components/marketing/DevGrid";
import type { ClientSetup } from "@/lib/seo/clients";

/*
 * Animated product shots for the SEO pages, wired to each page's data. All of
 * them are the real app screens the homepage uses, pointed at one network or
 * one AI client.
 */

const frame = "h-full overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_50px_120px_-50px_rgba(16,24,40,0.45)]";

const LIMITS: Record<string, number> = { x: 280, linkedin: 3000, bluesky: 300, mastodon: 500, tiktok: 2200, youtube: 5000 };
const COMPANIONS: Record<string, string[]> = {
  x: ["linkedin", "bluesky"],
  linkedin: ["x", "bluesky"],
  bluesky: ["x", "mastodon"],
  mastodon: ["bluesky", "x"],
  tiktok: ["youtube"],
  youtube: ["tiktok"],
};

/** The composer, typing this network's cut of the example post. */
export function NetworkComposerDemo({ network, text, media }: { network: string; text: string; media?: "video" | "images" }) {
  const channels = [network, ...(COMPANIONS[network] ?? [])].map((id) => ({ id, limit: LIMITS[id] ?? 2200 }));
  return (
    <Fit minWidth={760} height={600} mobile={{ renderWidth: 560, viewWidth: 560, height: 600 }}>
      <div className={frame}>
        <ComposerShot channels={channels} variants={{ [network]: text }} media={media} />
      </div>
    </Fit>
  );
}

/** The Developers page, adding this client's connector and it signing in. */
export function ClientSetupDemo({ client }: { client: { logo: string; name: string; setup: ClientSetup } }) {
  return (
    <Fit minWidth={900} height={660} mobile={{ renderWidth: 480, viewWidth: 480, height: 660 }}>
      <div className={frame}>
        <DevShot client={client} />
      </div>
    </Fit>
  );
}

/** The week calendar, as on the homepage. */
export function CalendarHeroDemo() {
  return (
    <Fit minWidth={860} height={700} mobile={{ renderWidth: 860, viewWidth: 430, x: 196, y: 124, height: 470 }}>
      <div className={frame}>
        <CalendarDemo productShot />
      </div>
    </Fit>
  );
}

/** Three brand tiles for a network page: calendar, the in-app agent, and MCP. */
export function NetworkTiles({
  network,
  name,
  calendar,
  agent,
  agentPrompt,
}: {
  network: string;
  name: string;
  calendar: string;
  agent: string;
  agentPrompt: string;
}) {
  const channels = [network, ...(COMPANIONS[network] ?? []).slice(0, 1)];
  const video = network === "tiktok" || network === "youtube";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-5">
      <Tile className="md:col-span-5" tone="blue" layout="side" label="Calendar" title="Your week, on one calendar" body={calendar}>
        <div className="h-[560px] w-[900px] overflow-hidden rounded-2xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
          <CalendarDemo productShot sidebar={false} />
        </div>
      </Tile>
      <Tile className="md:col-span-3" tone="amber" layout="top" label="AI agent" title="Ask for a post, get it scheduled" body={agent}>
        <AgentShot
          prompt={agentPrompt}
          channels={channels}
          reply={
            video
              ? "Here's a caption for your video. It's set for the time you asked."
              : `Here's a version for each channel, sized to fit. It's set for the time you asked.`
          }
        />
      </Tile>
      <Tile
        className="md:col-span-2"
        tone="red"
        layout="bottom"
        label="MCP"
        title={`Or let Claude post to ${name}`}
        body={
          video
            ? `Connect Claude, Cursor or another MCP client. It can draft your ${name} captions and check what's queued; you add the video.`
            : `Connect Claude, Cursor or another MCP client and it can schedule ${name} posts for you, straight from the chat.`
        }
      >
        <div className="pt-16">
          <ToolsShot />
        </div>
      </Tile>
    </div>
  );
}

/** Tiles for an AI client page: tools, calendar, revoke. */
export function ClientTiles({ name }: { name: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-5">
      <Tile
        className="md:col-span-2"
        tone="amber"
        layout="bottom"
        label="Tools"
        title="Four tools, nothing surprising"
        body={`${name} can list your channels, create posts and threads, check the queue and cancel a post. It can't delete anything or change your account.`}
      >
        <div className="pt-16">
          <ToolsShot />
        </div>
      </Tile>
      <Tile
        className="md:col-span-3"
        tone="blue"
        layout="top"
        label="Access"
        title="Take access back in one click"
        body={`${name} shows up under Connected apps on your Developers page. Revoke it and it's cut off immediately.`}
      >
        <RevokeShot />
      </Tile>
      <Tile
        className="md:col-span-5"
        tone="red"
        layout="side"
        label="Calendar"
        title={`Every post ${name} schedules lands in your calendar`}
        body="Agent posts sit next to yours. Review, edit or cancel them before they go out."
      >
        <div className="h-[560px] w-[900px] overflow-hidden rounded-2xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
          <CalendarDemo productShot sidebar={false} showAgent fromHour={11} />
        </div>
      </Tile>
    </div>
  );
}

/** Tiles for an alternatives page: the in-app agent, MCP clients, calendar. */
export function AlternativeTiles() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-5">
      <Tile
        className="md:col-span-3"
        tone="blue"
        layout="top"
        label="MCP"
        title="Connect the AI tool you already use"
        body="Claude, Claude Code, Cursor, VS Code, Windsurf or Gemini CLI. Sign in with Postbase and your agent can schedule posts, with no key to paste."
      >
        <McpShot />
      </Tile>
      <Tile
        className="md:col-span-2"
        tone="amber"
        layout="top"
        label="AI agent"
        title="Or use the agent built in"
        body="Tell it what to post and when. It checks your channels, writes each version and schedules it when you say so."
      >
        <AgentShot />
      </Tile>
      <Tile
        className="md:col-span-5"
        tone="red"
        layout="side"
        label="Calendar"
        title="Everything on one calendar"
        body="Posts you write and posts your agent schedules, across every network, in a month, week or day view."
      >
        <div className="h-[560px] w-[900px] overflow-hidden rounded-2xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
          <CalendarDemo productShot sidebar={false} showAgent fromHour={11} />
        </div>
      </Tile>
    </div>
  );
}
