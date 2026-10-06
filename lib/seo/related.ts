import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { CLIENTS } from "@/lib/seo/clients";
import { COMPETITORS, competitorCard } from "@/lib/seo/competitors";
import { MCP_NETWORKS } from "@/lib/seo/mcp";
import { listPosts } from "@/lib/blog";
import type { LinkCard } from "@/components/marketing/seo/sections";

const TOOLS: Record<string, LinkCard> = {
  "/tools/character-counter": {
    href: "/tools/character-counter",
    title: "Character counter",
    brand: "x",
    body: "Count a post per network and split it into a thread.",
  },
  "/tools/social-media-image-sizes": {
    href: "/tools/social-media-image-sizes",
    title: "Image and video sizes",
    brand: "instagram",
    body: "Every image and video size for nine networks.",
  },
  "/tools/mcp-config": {
    href: "/tools/mcp-config",
    title: "MCP config generator",
    client: "claude",
    body: "The exact MCP setup for your AI tool, ready to paste.",
  },
};

/** Turn an internal path into a link card, using the page data for its title and icon. */
export function relatedCard(href: string): LinkCard | null {
  const [, kind, slug] = href.split("/");
  if (kind === "integrations") {
    const n = LIVE_NETWORKS.find((x) => x.slug === slug);
    return n ? { href, title: n.eyebrow, brand: n.id, body: n.blurb } : null;
  }
  if (kind === "ai") {
    const c = CLIENTS.find((x) => x.slug === slug);
    return c ? { href, title: c.eyebrow, client: c.logo, body: c.blurb } : null;
  }
  if (kind === "mcp") {
    if (!slug) return { href, title: "The MCP server", mark: "#2b59d9", body: "Endpoint, sign-in, the four tools and their limits." };
    const m = MCP_NETWORKS.find((x) => x.slug === slug);
    const n = LIVE_NETWORKS.find((x) => x.slug === slug);
    return m && n ? { href, title: `${n.name} MCP server`, brand: n.id, body: m.behaviour[0].value } : null;
  }
  if (kind === "alternatives") {
    const c = COMPETITORS.find((x) => x.slug === slug);
    return c ? competitorCard(c) : null;
  }
  if (kind === "blog") {
    const p = listPosts().find((x) => x.slug === slug);
    return p ? { href, title: p.title, body: p.description } : null;
  }
  return TOOLS[href] ?? null;
}

export const relatedCards = (hrefs: string[]) => hrefs.map(relatedCard).filter((c): c is LinkCard => !!c);
