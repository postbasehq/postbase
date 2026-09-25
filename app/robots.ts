import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The signed-in app, APIs and one-off flows stay out of search results.
const PRIVATE = [
  "/api/",
  "/auth/",
  "/oauth/",
  "/invite/",
  "/composer-preview",
  "/calendar",
  "/queue",
  "/composer",
  "/drafts",
  "/channels",
  "/media",
  "/analytics",
  "/agent",
  "/api-keys",
  "/settings",
  "/team",
  "/billing",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
