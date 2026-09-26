import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { Eyebrow, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { CharacterCounter } from "@/components/marketing/tools/CharacterCounter";

const TITLE = "Character counter for X, Bluesky, LinkedIn, Threads and more";
const DESCRIPTION =
  "Free character counter that counts the way each network does: X's weighted 280 (links count as 23, emoji as 2), Bluesky's 300, LinkedIn's 3,000 and more. Splits long text into a thread.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "Character counter" }];

const FAQS: [string, string][] = [
  [
    "How does X count characters?",
    "X allows 280 weighted characters. Most Latin letters, numbers and punctuation count as 1. Emoji and Chinese, Japanese and Korean characters count as 2. Every link counts as 23, however long it is, and attached images or videos don't count at all.",
  ],
  [
    "Why does my Bluesky post count differently from X?",
    "Bluesky allows 300 graphemes, which is what a person would count as characters: an emoji with a skin tone is one, and links count at their full length. X uses weighted counting, so the same text gives two different numbers.",
  ],
  [
    "How long can a LinkedIn post be?",
    "Up to 3,000 characters. Only the first few lines show before the 'see more' link, so put the point of the post at the top.",
  ],
  [
    "What's the Mastodon character limit?",
    "500 by default, though some instances allow more. Links count as 23 characters, and a mention like @name@server.social only counts the @name part.",
  ],
  [
    "How does the thread splitter decide where to break?",
    "It keeps paragraphs together when they fit, then breaks between sentences, and only splits a sentence between words when it has to. If you turn on numbering, it leaves room for the '1/3' at the end of each post.",
  ],
  [
    "Is my text sent anywhere?",
    "No. The counting happens in your browser and nothing you type leaves the page.",
  ],
];

export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, ...pageMeta("/tools/character-counter") };

export default function CharacterCounterPage() {
  return (
    <>
      <SeoJsonLd path="/tools/character-counter" name={TITLE} description={DESCRIPTION} trail={TRAIL} faqs={FAQS} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          eyebrow={<Eyebrow>Free tool</Eyebrow>}
          h1={["Social media", "character counter"]}
          sub="Counts your post the way each network does, not just letters, and splits long text into a thread that fits."
          cta={{ label: "Schedule posts free for 7 days", href: "/login" }}
        />

        <section className={`${wrap} pt-12`}>
          <CharacterCounter />
        </section>

        <section className={section}>
          <SectionHead title="Limits at a glance" sub="Checked September 2026." />
          <div className="mx-auto max-w-[820px] overflow-x-auto rounded-[20px] border border-line bg-surface">
            <table className="w-full text-left text-[15px]">
              <thead className="bg-ground font-display text-[13px] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Network</th>
                  <th className="px-5 py-3 font-semibold">Limit</th>
                  <th className="px-5 py-3 font-semibold">How it counts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {[
                  ["X", "280 per post", "Weighted: links 23, emoji and CJK 2"],
                  ["Bluesky", "300 per post", "Graphemes (what you'd count by eye)"],
                  ["Threads", "500 per post", "Characters"],
                  ["Mastodon", "500 per post (default)", "Links 23, remote mentions by name only"],
                  ["LinkedIn", "3,000 per post", "Characters"],
                  ["Instagram", "2,200 per caption", "Characters"],
                  ["TikTok", "2,200 per caption", "Characters"],
                  ["YouTube", "100 per title, 5,000 bytes per description", "Characters and bytes"],
                ].map(([n, l, h]) => (
                  <tr key={n}>
                    <td className="px-5 py-3 font-semibold">{n}</td>
                    <td className="px-5 py-3">{l}</td>
                    <td className="px-5 py-3 text-muted">{h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={FAQS} />
        </section>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body="Postbase checks every network's limit as you type, then schedules each version on time."
            secondary={{ label: "See all integrations", href: "/integrations" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
