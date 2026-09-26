"use client";

import { AgentShot } from "@/components/marketing/CreatorGrid";
import { McpShot, RevokeShot, ToolsShot } from "@/components/marketing/DevGrid";
import { CalendarHeroDemo, ClientSetupDemo, NetworkComposerDemo } from "@/components/marketing/seo/demos";
import { CLIENTS } from "@/lib/seo/clients";
import { LIVE_NETWORKS } from "@/lib/seo/networks";

/*
 * Product shots a blog post can drop in with `::demo name key=value`:
 *   ::demo client-setup client=claude-code
 *   ::demo composer network=bluesky
 *   ::demo agent prompt="…" channels=x,linkedin
 *   ::demo calendar | tools | revoke | mcp
 * Optional caption="…" on any of them.
 */

export function Demo({ name, props }: { name: string; props: Record<string, string> }) {
  const shot = render(name, props);
  if (!shot) return null;
  return (
    <figure className="not-prose my-10">
      <div className="overflow-hidden rounded-[24px] border border-line bg-ground p-3 md:p-4">{shot}</div>
      {props.caption ? <figcaption className="mt-3 text-center text-[13.5px] text-muted">{props.caption}</figcaption> : null}
    </figure>
  );
}

/** Centre a fixed-width shot and scale it down on narrow screens. */
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-4 max-sm:[zoom:0.72]">{children}</div>;
}

function render(name: string, p: Record<string, string>) {
  switch (name) {
    case "client-setup": {
      const c = CLIENTS.find((x) => x.slug === p.client) ?? CLIENTS[0];
      return <ClientSetupDemo client={{ logo: c.logo, name: c.name, setup: c.setup }} />;
    }
    case "composer": {
      const n = LIVE_NETWORKS.find((x) => x.slug === p.network) ?? LIVE_NETWORKS[0];
      return <NetworkComposerDemo network={n.id} text={n.demo.text} media={n.demo.media} />;
    }
    case "agent":
      return (
        <Centered>
          <AgentShot prompt={p.prompt} channels={p.channels?.split(",")} reply={p.reply} />
        </Centered>
      );
    case "calendar":
      return <CalendarHeroDemo />;
    case "tools":
      return (
        <Centered>
          <ToolsShot />
        </Centered>
      );
    case "revoke":
      return (
        <Centered>
          <RevokeShot />
        </Centered>
      );
    case "mcp":
      return (
        <div className="flex justify-center overflow-hidden py-4 max-md:[zoom:0.5]">
          <McpShot />
        </div>
      );
    default:
      return null;
  }
}
