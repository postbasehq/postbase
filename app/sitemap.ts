import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { CLIENTS } from "@/lib/seo/clients";
import { COMPETITORS } from "@/lib/seo/competitors";
import { listPosts } from "@/lib/blog";
import { PERSONAS } from "@/lib/seo/personas";
import { ALL_COMBOS } from "@/lib/seo/combos";
import { MCP_NETWORKS } from "@/lib/seo/mcp";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only blog pages carry a lastmod: it comes from the post's own dates, so it
  // stays accurate. A build-time date on every page teaches Google to ignore it.
  const posts = listPosts();
  const latest = posts.reduce((d, p) => ((p.updated ?? p.date) > d ? (p.updated ?? p.date) : d), "");
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/developers", 0.9, "weekly"),
    page("/pricing", 0.8, "monthly"),
    page("/integrations", 0.8, "monthly"),
    ...LIVE_NETWORKS.map((n) => page(`/integrations/${n.slug}`, 0.8, "monthly")),
    page("/mcp", 0.9, "monthly"),
    ...MCP_NETWORKS.map((m) => page(`/mcp/${m.slug}`, 0.8, "monthly")),
    page("/ai", 0.8, "monthly"),
    ...CLIENTS.map((c) => page(`/ai/${c.slug}`, 0.8, "monthly")),
    ...ALL_COMBOS.map((c) => page(`/ai/${c.client}/${c.network}`, 0.7, "monthly")),
    ...PERSONAS.map((p) => page(`/for/${p.slug}`, 0.8, "monthly")),
    page("/alternatives", 0.6, "monthly"),
    ...COMPETITORS.map((c) => page(`/alternatives/${c.slug}`, 0.7, "monthly")),
    page("/contact", 0.5, "yearly"),
    page("/tools", 0.6, "monthly"),
    page("/tools/character-counter", 0.8, "monthly"),
    page("/tools/mcp-config", 0.7, "monthly"),
    page("/tools/social-media-image-sizes", 0.8, "monthly"),
    { ...page("/blog", 0.8, "weekly"), lastModified: new Date(latest) },
    ...posts.map((p) => ({ ...page(`/blog/${p.slug}`, 0.7, "monthly"), lastModified: new Date(p.updated ?? p.date) })),
    page("/terms", 0.3, "yearly"),
    page("/privacy", 0.3, "yearly"),
  ];
}
