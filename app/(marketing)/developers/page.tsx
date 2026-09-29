import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { Landing } from "@/components/marketing/Landing";
import { AiToolCards, NetworkCards } from "@/components/marketing/HomeCards";
import { JsonLd } from "@/components/marketing/JsonLd";

const DESCRIPTION =
  "Let Claude, Cursor or your own code post to social media. A hosted MCP server and REST API for scheduling to X, LinkedIn, TikTok, YouTube and more.";

export const metadata: Metadata = {
  title: "Social media API and MCP server for AI agents",
  description: DESCRIPTION,
  ...pageMeta("/developers"),
};

export default function Developers() {
  return (
    <>
      <JsonLd description={DESCRIPTION} />
      <Landing initialAudience="developers" networkCards={<NetworkCards />} aiToolCards={<AiToolCards />} />
    </>
  );
}
