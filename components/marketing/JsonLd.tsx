import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { FAQ } from "@/components/marketing/faq";

/**
 * schema.org structured data for the marketing pages: who we are, the site,
 * the product with its real plan prices, and (on the homepage) the FAQ, which
 * mirrors the FAQ shown on the page word for word.
 */
/** The product with its real plan prices. Also carried by every SEO page (SeoJsonLd), so each decision page describes what it sells. */
export function softwareNode(description: string): Record<string, unknown> {
  const prices = PLAN_ORDER.map((id) => PLANS[id].monthly);
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: SITE_NAME,
    url: SITE_URL,
    description,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Social media management",
    operatingSystem: "Web",
    publisher: { "@id": `${SITE_URL}/#organization` },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
      url: `${SITE_URL}/pricing`,
    },
  };
}

/** The software's own one-line description, used wherever a page doesn't describe it itself. */
export const SOFTWARE_DESCRIPTION =
  "Open-source social media scheduler for X, LinkedIn, Bluesky, Mastodon, TikTok and YouTube, with a hosted MCP server and REST API for AI tools.";

export function JsonLd({ withFaq = false, description }: { withFaq?: boolean; description: string }) {
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: "Berkway Group Limited",
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      email: "team@postbase.so",
      sameAs: ["https://github.com/postbasehq", "https://x.com/postbasehq"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    softwareNode(description),
  ];
  if (withFaq) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    });
  }
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output contains no HTML; escape "<" anyway so it can't close the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") }}
    />
  );
}
