import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { Landing } from "@/components/marketing/Landing";
import { AiToolCards, NetworkCards } from "@/components/marketing/HomeCards";
import { JsonLd } from "@/components/marketing/JsonLd";

const DESCRIPTION =
  "Let Claude, Cursor or your own code post to social media. A hosted MCP server and REST API for scheduling to X, LinkedIn, Bluesky, Mastodon and YouTube.";

export const metadata: Metadata = {
  title: { absolute: "Postbase: social media scheduler and API for AI agents" },
  description: DESCRIPTION,
  ...pageMeta("/"),
};

export default function Home() {
  return (
    <>
      <JsonLd withFaq description={DESCRIPTION} />
      <Landing initialAudience="developers" networkCards={<NetworkCards />} aiToolCards={<AiToolCards />} />
    </>
  );
}
