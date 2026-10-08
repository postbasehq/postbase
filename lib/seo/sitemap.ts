import { SITE_URL } from "@/lib/site";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { CLIENTS } from "@/lib/seo/clients";
import { COMPETITORS } from "@/lib/seo/competitors";
import { PERSONAS } from "@/lib/seo/personas";
import { ALL_COMBOS } from "@/lib/seo/combos";
import { MCP_NETWORKS } from "@/lib/seo/mcp";
import { TOOLS } from "@/lib/seo/related";
import { listPosts } from "@/lib/blog";
import { listEntries } from "@/lib/changelog";

/*
 * The sitemap, split by page type: /sitemap.xml is an index of
 * /sitemaps/<name>.xml, so Search Console reports indexing per type.
 *
 * Only blog and changelog pages carry a lastmod: it comes from the entry's own
 * dates, so it stays accurate. A build-time date on every page teaches Google
 * to ignore it.
 */

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
};

const page = (path: string, priority: number, changeFrequency: SitemapEntry["changeFrequency"], lastModified?: Date): SitemapEntry => ({
  url: `${SITE_URL}${path}`,
  changeFrequency,
  priority,
  ...(lastModified ? { lastModified } : {}),
});

export const SITEMAPS: Record<string, () => SitemapEntry[]> = {
  pages: () => [
    page("/", 1, "weekly"),
    page("/pricing", 0.8, "monthly"),
    page("/developers", 0.9, "weekly"),
    page("/contact", 0.5, "yearly"),
    page("/terms", 0.3, "yearly"),
    page("/privacy", 0.3, "yearly"),
  ],
  integrations: () => [page("/integrations", 0.8, "monthly"), ...LIVE_NETWORKS.map((n) => page(`/integrations/${n.slug}`, 0.8, "monthly"))],
  alternatives: () => [page("/alternatives", 0.6, "monthly"), ...COMPETITORS.map((c) => page(`/alternatives/${c.slug}`, 0.7, "monthly"))],
  mcp: () => [page("/mcp", 0.9, "monthly"), ...MCP_NETWORKS.map((m) => page(`/mcp/${m.slug}`, 0.8, "monthly"))],
  ai: () => [
    page("/ai", 0.8, "monthly"),
    ...CLIENTS.map((c) => page(`/ai/${c.slug}`, 0.8, "monthly")),
    ...ALL_COMBOS.map((c) => page(`/ai/${c.client}/${c.network}`, 0.7, "monthly")),
  ],
  "use-cases": () => PERSONAS.map((p) => page(`/for/${p.slug}`, 0.8, "monthly")),
  // Every tool page is in TOOLS (it also drives the /tools hub and related links).
  tools: () => [page("/tools", 0.6, "monthly"), ...Object.keys(TOOLS).map((path) => page(path, 0.8, "monthly"))],
  blog: () => {
    const posts = listPosts();
    const latest = posts.reduce((d, p) => ((p.updated ?? p.date) > d ? (p.updated ?? p.date) : d), "");
    return [
      page("/blog", 0.8, "weekly", latest ? new Date(latest) : undefined),
      ...posts.map((p) => page(`/blog/${p.slug}`, 0.7, "monthly", new Date(p.updated ?? p.date))),
    ];
  },
  changelog: () => {
    const changes = listEntries();
    if (!changes.length) return [];
    return [
      page("/changelog", 0.6, "weekly", new Date(changes[0].date)),
      ...changes.map((e) => page(`/changelog/${e.slug}`, 0.4, "yearly", new Date(e.date))),
    ];
  },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const day = (d: Date) => d.toISOString();

export function sitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.map(
    (e) =>
      `<url><loc>${esc(e.url)}</loc>${e.lastModified ? `<lastmod>${day(e.lastModified)}</lastmod>` : ""}<changefreq>${e.changeFrequency}</changefreq><priority>${e.priority}</priority></url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

/** The index: each non-empty section, with the newest lastmod it has (if any). */
export function sitemapIndexXml(): string {
  const items = Object.entries(SITEMAPS)
    .map(([name, entries]) => ({ name, entries: entries() }))
    .filter((s) => s.entries.length)
    .map(({ name, entries }) => {
      const dates = entries.map((e) => e.lastModified?.getTime()).filter((t): t is number => t != null);
      const lastmod = dates.length ? `<lastmod>${day(new Date(Math.max(...dates)))}</lastmod>` : "";
      return `<sitemap><loc>${SITE_URL}/sitemaps/${name}.xml</loc>${lastmod}</sitemap>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</sitemapindex>\n`;
}

export const xmlResponse = (xml: string) =>
  new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600" } });
