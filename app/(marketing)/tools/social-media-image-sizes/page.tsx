import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { SPECS } from "@/lib/seo/specs";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { Eyebrow, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { SizeGuide } from "@/components/marketing/tools/SizeGuide";
import { RelatedPosts } from "@/components/marketing/blog/RelatedPosts";

const PATH = "/tools/social-media-image-sizes";
const TITLE = "Social media image and video sizes (2026)";
const DESCRIPTION =
  "Image and video sizes for Instagram, TikTok, YouTube, X, LinkedIn, Facebook, Threads, Bluesky and Mastodon, checked September 2026.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "Image and video sizes" }];

const FAQS: [string, string][] = [
  [
    "What's the best image size for Instagram posts?",
    "1080 × 1350 (4:5 portrait) takes up the most space in the feed. Square 1080 × 1080 and landscape 1080 × 566 also work; anything between 1.91:1 and 4:5 is accepted.",
  ],
  [
    "What size should vertical videos be?",
    "1080 × 1920 (9:16) works for TikTok, Instagram Reels and Stories, YouTube Shorts, Facebook Reels and Threads. Make one vertical master and reuse it everywhere.",
  ],
  [
    "What's the YouTube thumbnail size?",
    "16:9, at least 1280 × 720. YouTube now accepts up to 3840 × 2160; the file limit is 2 MB from a phone and 50 MB from a computer.",
  ],
  [
    "How long can Bluesky videos be?",
    "Up to 10 minutes and 300 MB, since Bluesky raised the limit in August 2026. Many size guides still say 3 minutes.",
  ],
  [
    "Why does my scheduler reject a video the app accepts?",
    "Networks often set different limits for their own apps and for their APIs, which is what schedulers use. Instagram carousels, for example, allow 20 items in the app but 10 through the API.",
  ],
];

export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, ...pageMeta(PATH, { ownImage: true }) };

export default function ImageSizesPage() {
  return (
    <>
      <SeoJsonLd path={PATH} name={TITLE} description={DESCRIPTION} trail={TRAIL} faqs={FAQS} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          eyebrow={<Eyebrow>Free tool</Eyebrow>}
          h1={["Social media image and", "video sizes"]}
          sub="Every size, ratio and limit for nine networks, checked against each network's own guidance in September 2026. Pick a network to see its specs."
          cta={{ label: "Schedule posts free for 7 days", href: "/login" }}
        />

        <section className={`${wrap} pt-12`}>
          <SizeGuide networks={SPECS} />
        </section>

        <section className={section}>
          <SectionHead title="One vertical video, everywhere" sub="The shortcut most creators use." />
          <div className="mx-auto max-w-[820px] rounded-[20px] border border-line bg-surface p-6 text-[15px] leading-relaxed text-ink">
            Export one <strong>1080 × 1920</strong> video at 30 fps as an MP4 (H.264), keep it under 90 seconds and 100 MB,
            and it fits TikTok, Reels, Shorts, Facebook Reels, Threads and Bluesky without re-exporting. For images, a{" "}
            <strong>1080 × 1350</strong> portrait works on Instagram, Facebook, LinkedIn, Threads and Bluesky.
          </div>
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={FAQS} />
        </section>

        <RelatedPosts path={PATH} />

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body="Upload a video once and schedule it to TikTok, YouTube and more, with a caption for each network."
            secondary={{ label: "See all integrations", href: "/integrations" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
