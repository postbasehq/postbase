import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { Landing } from "@/components/marketing/Landing";
import { JsonLd } from "@/components/marketing/JsonLd";

const DESCRIPTION =
  "Schedule and publish to X, LinkedIn, Instagram, TikTok, YouTube, Bluesky and Mastodon from one calendar. Open source, with an MCP server so Claude and other AI agents can post for you.";

export const metadata: Metadata = {
  title: { absolute: "Postbase: The open-source social media scheduler for creators and AI agents" },
  description: DESCRIPTION,
  ...pageMeta("/"),
};

export default function Home() {
  return (
    <>
      <JsonLd withFaq description={DESCRIPTION} />
      <Landing initialAudience="creators" />
    </>
  );
}
