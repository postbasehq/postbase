import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { PostPreviewTool } from "@/components/marketing/tools/PostPreviewTool";
import { RelatedPosts } from "@/components/marketing/blog/RelatedPosts";

const PATH = "/tools/social-media-post-preview";
const TITLE = "Social media post preview for X, LinkedIn, Instagram and more";
const DESCRIPTION =
  "Free social media post preview: see how one post looks on X, LinkedIn, Bluesky, Mastodon, Facebook, Instagram, TikTok and YouTube, with your images or video, before you publish.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "Post preview" }];

const FAQS: [string, string][] = [
  [
    "What does the preview show?",
    "Your text and media laid out the way each network shows a post in the feed: where the text folds behind \"more\", how images are cropped side by side, and how a video sits in a vertical TikTok or a YouTube card. It's the same preview Postbase shows when you schedule a post.",
  ],
  [
    "Are my images uploaded?",
    "No. Files you add stay on your device: the page shows them straight from your browser and nothing is sent to a server.",
  ],
  [
    "Why are the counts different on each network?",
    "Each network counts its own way. X weighs links as 23 and most emoji as 2, Bluesky counts what you'd count by eye, and LinkedIn allows 3,000 characters to X's 280. The number above each preview is that network's count.",
  ],
  [
    "Is it exactly what the network will show?",
    "It's close, not pixel-perfect. Networks change their layouts often and differ between the app and the web, so check the first post on a new layout yourself.",
  ],
  [
    "Can I schedule the post from here?",
    "Not from this page. In Postbase you write the post once, change the wording per network, see these previews and schedule it to all of them on one calendar.",
  ],
];

export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, ...pageMeta(PATH, { ownImage: true }) };

export default function PostPreviewPage() {
  return (
    <>
      <SeoJsonLd path={PATH} name={TITLE} description={DESCRIPTION} trail={TRAIL} faqs={FAQS} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          h1={["Social media", "post preview"]}
          sub="Write once, add a photo or video, and see how the post looks on eight networks before it goes out."
          cta={{ label: "Schedule posts free for 7 days", href: "/login" }}
        />

        <section className={`${wrap} pt-12`}>
          <PostPreviewTool />
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={FAQS} />
        </section>

        <RelatedPosts path={PATH} />

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body="See every network's preview while you write, then schedule them all from one calendar."
            secondary={{ label: "See all integrations", href: "/integrations" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
