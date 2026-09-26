import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { CLIENTS } from "@/lib/seo/clients";
import { COMPETITORS } from "@/lib/seo/competitors";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/developers", 0.9, "weekly"),
    page("/pricing", 0.8, "monthly"),
    page("/integrations", 0.8, "monthly"),
    ...LIVE_NETWORKS.map((n) => page(`/integrations/${n.slug}`, 0.8, "monthly")),
    page("/ai", 0.8, "monthly"),
    ...CLIENTS.map((c) => page(`/ai/${c.slug}`, 0.8, "monthly")),
    page("/alternatives", 0.6, "monthly"),
    ...COMPETITORS.map((c) => page(`/alternatives/${c.slug}`, 0.7, "monthly")),
    page("/login", 0.5, "yearly"),
    page("/terms", 0.3, "yearly"),
    page("/privacy", 0.3, "yearly"),
  ];
}
