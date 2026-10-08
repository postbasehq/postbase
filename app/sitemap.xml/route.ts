import { sitemapIndexXml, xmlResponse } from "@/lib/seo/sitemap";

// The sitemap index; the sections are in app/sitemaps/[name] (lib/seo/sitemap.ts).
export const dynamic = "force-static";

export function GET() {
  return xmlResponse(sitemapIndexXml());
}
