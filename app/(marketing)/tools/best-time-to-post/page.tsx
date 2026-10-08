import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandTile } from "@/components/BrandTile";
import { SITE_URL, pageMeta } from "@/lib/site";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { BestTimeFinder } from "@/components/marketing/tools/BestTimeFinder";
import { RelatedPosts } from "@/components/marketing/blog/RelatedPosts";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { relatedCards } from "@/lib/seo/related";
import { NETWORK_TIMES, summary } from "@/lib/seo/best-times";

const PATH = "/tools/best-time-to-post";
const TITLE = "Best time to post on social media in 2026";
const DESCRIPTION =
  "Find the best time to post on Instagram, TikTok, LinkedIn, X, Facebook, YouTube and more, converted to your time zone. Free, instant, no signup.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: "Best time to post" }];

const LIVE = LIVE_NETWORKS.map((n) => n.id);
const ROWS = NETWORK_TIMES.map((n) => ({ ...n, ...summary(n), href: LIVE.includes(n.id) ? `/integrations/${n.id}` : null }));
const at = (id: string) => ROWS.find((r) => r.id === id)!;

const FAQS: [string, string][] = [
  [
    "What is the best time to post on social media?",
    "For most accounts, weekday mornings to early afternoon, Tuesday to Thursday, in your audience's time zone. Professional networks like LinkedIn peak before and around work, while TikTok and YouTube do better in the afternoon and evening, when people have time to watch.",
  ],
  [
    "What is the best time to post on Instagram?",
    `${at("instagram").days}, ${at("instagram").window}, in your followers' time zone. Accounts with a consumer audience also do well in the early evening. Reels keep reaching new viewers for days, so timing matters most for feed posts and Stories.`,
  ],
  [
    "What is the best time to post on LinkedIn?",
    `${at("linkedin").days}, ${at("linkedin").window}. LinkedIn is read at work, so the start of the working day and lunchtime are strongest, and weekends are the quietest days of the week.`,
  ],
  [
    "What is the best time to post on TikTok?",
    `Afternoons and evenings, ${at("tiktok").window}, with ${at("tiktok").days} slightly ahead. TikTok tests each video on a small group first, so posting when your followers are scrolling gives it a better start.`,
  ],
  [
    "Should I post in my time zone or my audience's?",
    "Your audience's. If you're in London and most of your followers are in New York, 10am for them is 3pm for you. Set the audience's time zone in the tool above and it shows each time in yours too.",
  ],
  [
    "Where do these times come from?",
    "They follow the patterns that repeat across the large published studies of when posts get the most engagement, from Sprout Social, Hootsuite, Buffer and Later. Treat them as a starting point: your own audience can differ, which is why Postbase's analytics works out your best times from your own posts.",
  ],
  [
    "Does posting time still matter with algorithmic feeds?",
    "Less than it used to, but yes. Most feeds judge a post by how people react in its first hour or two, so posting when your followers are online gives it a better start. On Bluesky and Mastodon, timelines are in time order, so timing matters even more.",
  ],
];

const TIPS: [string, string][] = [
  [
    "Post in your audience's time zone",
    "The times are local to the people you want to reach. If they're spread out, pick the zone where most of them are, or post twice for two regions.",
  ],
  [
    "Start here, then use your own numbers",
    "Studies average millions of accounts. After a month of posting, compare your own engagement by day and hour. Postbase's analytics does this for you, as the same weekly grid.",
  ],
  [
    "Consistency beats the perfect minute",
    "Posting three times a week at a good time does more than one post at the ideal time. Schedule a week ahead so it happens even when you're busy.",
  ],
  [
    "Video needs a head start",
    "Publish YouTube videos and long Reels two or three hours before your audience's evening, so they're processed and being recommended when people sit down to watch.",
  ],
];

export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, ...pageMeta(PATH, { ownImage: true }) };

/** The tool itself, as a free web app, alongside the page's own JSON-LD. */
function ToolJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}${PATH}#app`,
    name: "Best time to post finder",
    url: `${SITE_URL}${PATH}`,
    description: DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (runs in the browser)",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default function BestTimeToPostPage() {
  return (
    <>
      <SeoJsonLd path={PATH} name={TITLE} description={DESCRIPTION} trail={TRAIL} faqs={FAQS} />
      <ToolJsonLd />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          h1={["Best time to post on", "social media"]}
          sub="Pick a network and where your audience is. You get the best day and hour, the whole week at a glance, and each time converted to yours."
          cta={{ label: "Schedule posts free for 7 days", href: "/login" }}
        />

        <section className={`${wrap} pt-12`}>
          <BestTimeFinder />
        </section>

        <section className={section}>
          <SectionHead title="Best times for each network" sub="In your audience's local time, for a general audience. Use the tool above for businesses or consumers." />
          <div className="mx-auto max-w-[920px] overflow-x-auto rounded-[20px] border border-line bg-surface">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <thead className="bg-ground font-display text-[13px] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Network</th>
                  <th className="px-5 py-3 font-semibold">Best days</th>
                  <th className="px-5 py-3 font-semibold">Best times</th>
                  <th className="px-5 py-3 font-semibold">Quietest day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {ROWS.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5 font-semibold">
                        <BrandTile platform={r.id} size={22} radius={6} />
                        {r.href ? (
                          <Link href={r.href} className="underline decoration-line underline-offset-4 hover:decoration-ink">
                            {r.name}
                          </Link>
                        ) : (
                          r.name
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3">{r.days}</td>
                    <td className="px-5 py-3">{r.window}</td>
                    <td className="px-5 py-3 text-muted">{r.worst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={section}>
          <SectionHead title="How to use these times" />
          <div className="mx-auto grid max-w-[920px] gap-x-10 gap-y-6 text-[16px] leading-relaxed text-ink md:grid-cols-2">
            {TIPS.map(([title, body]) => (
              <div key={title}>
                <h3 className="font-display text-[17px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={FAQS} />
        </section>

        <section className={section}>
          <SectionHead title="More free tools" />
          <LinkCards items={relatedCards(["/tools/character-counter", "/tools/social-media-image-sizes", "/tools/social-media-post-preview"])} />
        </section>

        <RelatedPosts path={PATH} />

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body="Write once, schedule each network at its best time, and see your own best times in analytics."
            secondary={{ label: "See all integrations", href: "/integrations" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
