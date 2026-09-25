import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { Landing } from "@/components/marketing/Landing";
import { JsonLd } from "@/components/marketing/JsonLd";

const DESCRIPTION =
  "Let Claude, Cursor or your own code post to social media. Postbase has a hosted MCP server and a REST API for scheduling posts to X, LinkedIn, Instagram, TikTok, YouTube, Bluesky and Mastodon.";

export const metadata: Metadata = {
  title: "Social media API and MCP server for AI agents",
  description: DESCRIPTION,
  ...pageMeta("/developers"),
};

export default function Developers() {
  return (
    <>
      <JsonLd description={DESCRIPTION} />
      <Landing initialAudience="developers" />
    </>
  );
}
