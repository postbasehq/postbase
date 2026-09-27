import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { CLIENTS } from "@/lib/seo/clients";
import { COMPETITORS } from "@/lib/seo/competitors";
import { listPosts } from "@/lib/blog";
import type { LinkCard } from "@/components/marketing/seo/sections";

const TOOLS: Record<string, LinkCard> = {
  "/tools/character-counter": {
    href: "/tools/character-counter",
    title: "Character counter",
    brand: "x",
    body: "Counts your post the way X, Bluesky, LinkedIn and others do, and splits long text into a thread.",
  },
  "/tools/mcp-config": {
    href: "/tools/mcp-config",
    title: "MCP config generator",
    client: "claude",
    body: "The exact MCP setup for Claude, Cursor, VS Code and more.",
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
    return c ? { href, title: c.eyebrow, client: c.logo, body: c.metaDescription.split(". ")[0] + "." } : null;
  }
  if (kind === "alternatives") {
    const c = COMPETITORS.find((x) => x.slug === slug);
    return c ? { href, title: `Postbase vs ${c.name}`, body: c.them } : null;
  }
  if (kind === "blog") {
    const p = listPosts().find((x) => x.slug === slug);
    return p ? { href, title: p.title, body: p.description } : null;
  }
  return TOOLS[href] ?? null;
}

export const relatedCards = (hrefs: string[]) => hrefs.map(relatedCard).filter((c): c is LinkCard => !!c);
