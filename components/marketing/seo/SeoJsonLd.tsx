import { SITE_URL } from "@/lib/site";
import { SOFTWARE_DESCRIPTION, softwareNode } from "@/components/marketing/JsonLd";

/**
 * schema.org data for an SEO page: the page itself, its breadcrumb trail and
 * (when it has one) its FAQ, which must match the FAQ shown on the page word
 * for word. Carries the SoftwareApplication (with its plan prices) too, so a
 * decision page says what it sells without a hop to the homepage.
 */
export function SeoJsonLd({
  path,
  name,
  description,
  trail,
  faqs,
}: {
  path: string;
  name: string;
  description: string;
  trail: { label: string; href?: string }[];
  faqs?: [string, string][];
}) {
  const url = `${SITE_URL}${path}`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name,
      description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#software` },
      breadcrumb: { "@id": `${url}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: trail.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.label,
        item: `${SITE_URL}${t.href ?? path}`,
      })),
    },
    softwareNode(SOFTWARE_DESCRIPTION),
  ];
  if (faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
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
