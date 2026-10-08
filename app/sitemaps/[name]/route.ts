import { SITEMAPS, sitemapXml, xmlResponse } from "@/lib/seo/sitemap";

// One section of the sitemap, e.g. /sitemaps/alternatives.xml (lib/seo/sitemap.ts).
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SITEMAPS).map((name) => ({ name: `${name}.xml` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = (await params).name.replace(/\.xml$/, "");
  const entries = SITEMAPS[name]?.();
  if (!entries) return new Response("Not found", { status: 404 });
  return xmlResponse(sitemapXml(entries));
}
