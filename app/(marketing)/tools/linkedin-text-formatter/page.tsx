import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { LinkedInFormatter } from "@/components/marketing/tools/LinkedInFormatter";
import { RelatedPosts } from "@/components/marketing/blog/RelatedPosts";

const PATH = "/tools/linkedin-text-formatter";
const TITLE = "LinkedIn text formatter: bold, italic and lists";
const DESCRIPTION =
  "Free LinkedIn text formatter: make words bold, italic, underlined or struck through, add bullet and numbered lists, and preview where the post folds. Copy and paste into LinkedIn.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "LinkedIn text formatter" }];

const FAQS: [string, string][] = [
  [
    "Can you make text bold on LinkedIn?",
    "Not with LinkedIn's own editor for normal posts. This tool swaps your letters for Unicode characters that look bold or italic, so they keep their style when you paste them into a post, a comment or your headline.",
  ],
  [
    "How do I use it?",
    "Type or paste your post, select the words you want to style and click Bold, Italic or another style. Click the same style again to remove it. Then copy the post and paste it into LinkedIn.",
  ],
  [
    "Does styled text hurt reach or accessibility?",
    "Screen readers can read styled letters one by one or skip them, and LinkedIn search won't match them as normal words. Use it for a few words of emphasis, not whole posts, and keep names, hashtags and keywords plain.",
  ],
  [
    "Where does a LinkedIn post get cut off?",
    "In the feed LinkedIn shows the first few lines, roughly 200 characters on desktop and less on a phone, then a \"…more\" link. The preview shows about where that falls, so your hook should be in the first line or two.",
  ],
  [
    "How long can a LinkedIn post be?",
    "Up to 3,000 characters. The counter turns red when you're over.",
  ],
  [
    "Is my text sent anywhere?",
    "No. The formatting happens in your browser and nothing you type leaves the page.",
  ],
];

export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, ...pageMeta(PATH, { ownImage: true }) };

export default function LinkedInFormatterPage() {
  return (
    <>
      <SeoJsonLd path={PATH} name={TITLE} description={DESCRIPTION} trail={TRAIL} faqs={FAQS} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          h1={["LinkedIn", "text formatter"]}
          sub="Bold, italic, underline and lists that survive the paste into LinkedIn, with a preview of where your post folds."
          cta={{ label: "Schedule LinkedIn posts free for 7 days", href: "/login" }}
        />

        <section className={`${wrap} pt-12`}>
          <LinkedInFormatter />
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={FAQS} />
        </section>

        <RelatedPosts path={PATH} />

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body="Write it once, check every network's limit as you type, and let Postbase post it on time."
            secondary={{ label: "LinkedIn scheduling", href: "/integrations/linkedin" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
