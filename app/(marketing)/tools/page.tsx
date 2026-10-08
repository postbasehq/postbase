import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CtaBand, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { TOOLS } from "@/lib/seo/related";

const DESCRIPTION = "Free social media tools: a character counter, thread splitter, LinkedIn text formatter, post preview, image size guide and MCP config generator.";
/** A paragraph per job, so the hub explains itself (and gives crawlers some text). */
const GUIDE: [string, string][] = [
  [
    "Writing for several networks",
    "Every network counts characters its own way: X weighs links and emoji, Bluesky counts what you see, LinkedIn allows 3,000. The character counter shows all of them at once and splits long text into a thread that fits.",
  ],
  [
    "Making LinkedIn posts stand out",
    "LinkedIn has no bold or italic in posts. The text formatter swaps letters for Unicode ones that keep their style when pasted, adds lists, and shows where your post folds behind \"…more\".",
  ],
  [
    "Checking a post before it goes out",
    "The post preview lays one post out the way X, LinkedIn, Bluesky, Mastodon, Facebook, Instagram, TikTok and YouTube show it, with your own photos or video, so you can catch a bad crop or a buried hook.",
  ],
  [
    "Getting images and video right",
    "The size guide lists the image and video dimensions, ratios and file limits for each network, taken from their own documentation, so nothing gets cropped or rejected.",
  ],
  [
    "Posting from an AI tool",
    "The MCP config generator gives you the exact setup to paste into Claude, Cursor, VS Code or another MCP client, so your AI tool can draft and schedule posts through Postbase.",
  ],
  [
    "Free, and private",
    "All of the tools run in your browser. Nothing you type or add is uploaded, and you don't need an account. When you're ready to schedule, Postbase has a 7-day free trial.",
  ],
];

const TRAIL = [{ label: "Home", href: "/" }, { label: "Tools" }];

export const metadata: Metadata = { title: "Free social media tools", description: DESCRIPTION, ...pageMeta("/tools") };

export default function ToolsPage() {
  return (
    <>
      <SeoJsonLd path="/tools" name="Free tools" description={DESCRIPTION} trail={TRAIL} />
      <SiteNav />
      <main>
        <SeoHero trail={TRAIL} h1={["Free tools for", "posting"]} sub={DESCRIPTION} />
        <section className={section}>
          <SectionHead title="Tools" />
          <LinkCards items={Object.values(TOOLS)} />
        </section>
        <section className={section}>
          <SectionHead title="What they're for" />
          <div className="mx-auto grid max-w-[920px] gap-x-10 gap-y-6 text-[16px] leading-relaxed text-ink md:grid-cols-2">
            {GUIDE.map(([title, body]) => (
              <div key={title}>
                <h3 className="font-display text-[17px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>
        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand body="Schedule to every network from one calendar, or let your AI agent do it." secondary={{ label: "Read the blog", href: "/blog" }} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
