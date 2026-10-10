import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { Landing } from "@/components/marketing/Landing";
import { AiToolCards, NetworkCards } from "@/components/marketing/HomeCards";
import { JsonLd } from "@/components/marketing/JsonLd";

const DESCRIPTION =
  "Grow an audience on every network without living on social media. The open-source social media scheduler, listening bots and AI agents in one growth platform.";

export const metadata: Metadata = {
  title: { absolute: "Postbase: the open-source distribution and social growth platform" },
  description: DESCRIPTION,
  ...pageMeta("/"),
};

export default function Home() {
  return (
    <>
      <JsonLd withFaq description={DESCRIPTION} />
      <Landing initialAudience="creators" networkCards={<NetworkCards />} aiToolCards={<AiToolCards />} />
    </>
  );
}
