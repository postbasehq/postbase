"use client";

import { AgentShot, AnalyticsShot, MediaShot, MonthShot, QueueShot, Tile } from "@/components/marketing/CreatorGrid";
import { McpShot, RevokeShot, ToolsShot } from "@/components/marketing/DevGrid";
import { ComposerShot } from "@/components/marketing/ComposerShot";
import { CalendarDemo } from "@/components/marketing/CalendarDemo";

/*
 * Brand-colour feature tiles built from the homepage's real product shots, so
 * any SEO page can pick the screens that fit its audience. Each shot has a
 * fixed width in the 5-column grid; order features so rows add up to 5
 * (3 + 2, or a full-width 5).
 */

export type ShotKey = "month" | "agent" | "composer" | "media" | "queue" | "analytics" | "mcp" | "tools" | "revoke" | "calendar";

export type Feature = { shot: ShotKey; label: string; title: string; body: string };

const box = "overflow-hidden rounded-2xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]";

const SHOTS: Record<ShotKey, { span: 2 | 3 | 5; layout: "top" | "bottom" | "side"; el: () => React.ReactNode }> = {
  month: { span: 3, layout: "top", el: () => <MonthShot /> },
  mcp: { span: 3, layout: "top", el: () => <McpShot /> },
  queue: { span: 3, layout: "bottom", el: () => <div className="pt-16"><QueueShot /></div> },
  revoke: { span: 3, layout: "top", el: () => <RevokeShot /> },
  agent: { span: 2, layout: "bottom", el: () => <div className="pt-16"><AgentShot /></div> },
  tools: { span: 2, layout: "bottom", el: () => <div className="pt-16"><ToolsShot /></div> },
  media: { span: 2, layout: "top", el: () => <MediaShot /> },
  composer: {
    span: 5,
    layout: "side",
    el: () => (
      <div className={`h-[470px] w-[820px] ${box}`}>
        <ComposerShot />
      </div>
    ),
  },
  analytics: { span: 5, layout: "side", el: () => <AnalyticsShot /> },
  calendar: {
    span: 5,
    layout: "side",
    el: () => (
      <div className={`h-[560px] w-[900px] ${box}`}>
        <CalendarDemo productShot sidebar={false} showAgent fromHour={11} />
      </div>
    ),
  },
};

const SPAN = { 2: "md:col-span-2", 3: "md:col-span-3", 5: "md:col-span-5" } as const;
const TONES = ["blue", "amber", "red"] as const;

export function FeatureTiles({ features }: { features: Feature[] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-5">
      {features.map((f, i) => {
        const s = SHOTS[f.shot];
        return (
          <Tile key={f.shot} className={SPAN[s.span]} tone={TONES[i % 3]} layout={s.layout} label={f.label} title={f.title} body={f.body}>
            {s.el()}
          </Tile>
        );
      })}
    </div>
  );
}
