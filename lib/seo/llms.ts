import { SITE_URL } from "@/lib/site";
import { PLANS, PLAN_ORDER, aiFeature, xLinkFeature } from "@/lib/plans";
import { NETWORKS } from "@/lib/seo/networks";
import { CLIENTS, MCP_URL } from "@/lib/seo/clients";
import { MCP_NETWORKS } from "@/lib/seo/mcp";
import { COMPETITORS } from "@/lib/seo/competitors";
import { PERSONAS } from "@/lib/seo/personas";
import { listPosts } from "@/lib/blog";

/*
 * Plain-text summaries for AI assistants and answer engines: /llms.txt (the
 * llmstxt.org index), /llms-full.txt (the same plus the facts people ask
 * about) and /pricing.md. Built from the same data as the site so they can't
 * drift from it.
 */

const DOCS = "https://docs.postbase.so";
const live = NETWORKS.filter((n) => n.live);
const soon = NETWORKS.filter((n) => !n.live);
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const SUMMARY = `> Postbase (postbase.so) is an open-source social media scheduler. It publishes to ${list(live.map((n) => n.name))} from one calendar, and has a hosted MCP server and REST API so AI tools like Claude, ChatGPT, Claude Code and Cursor can draft and schedule posts. Plans start at $29/month with a 7-day free trial, or you can self-host it for free.`;

const NOT = `Postbase at postbase.so is not trypostbase.com, postbase.net or getpostbase.com (a Supabase/Firebase-style backend), which are unrelated products with similar names. ${list(soon.map((n) => n.name))} ${soon.length === 1 ? "is" : "are"} not supported yet.`;

export function pricingMarkdown(): string {
  const rows = PLAN_ORDER.map((id) => {
    const p = PLANS[id];
    return `| ${p.name} | $${p.monthly}/month or $${p.monthly * 10}/year | ${p.channels} | ${p.seats} | ${p.workspaces} | ${aiFeature(id)}; ${xLinkFeature(id)} |`;
  });
  return `# Postbase pricing

Source: ${SITE_URL}/pricing

Every plan includes every network (${list(live.map((n) => n.name))}), unlimited posts, threads and video, the calendar, drafts, analytics, the built-in AI agent, the MCP server and the REST API. Every plan starts with a 7-day free trial (card required, nothing charged until it ends). Prices are in USD. Annual billing is 10x the monthly price (two months free).

| Plan | Price | Channels | Seats | Workspaces | AI and X allowances |
| --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

- Workspaces share the plan's channels, seats and allowances. The Agency plan covers a workspace per client on one bill.
- X posts without links, and threads, are unlimited on every plan; only X posts containing a link are capped (X charges per linked post).
- Self-hosting is free: Postbase is open source (https://github.com/postbasehq/postbase) and runs with your own platform API keys.
`;
}

export function llmsTxt({ full = false } = {}): string {
  const posts = listPosts();
  const link = (path: string, title: string, note?: string) => `- [${title}](${SITE_URL}${path})${note ? `: ${note}` : ""}`;
  const parts = [
    `# Postbase`,
    SUMMARY,
    NOT,
    `## Product`,
    [
      link("/", "Home", "what Postbase does"),
      link("/pricing", "Pricing", "plans from $29/month, 7-day free trial"),
      `- [Pricing as Markdown](${SITE_URL}/pricing.md)`,
      link("/developers", "Developers", "MCP server and REST API"),
      link("/integrations", "Integrations", "supported networks"),
      ...live.map((n) => link(`/integrations/${n.slug}`, `${n.name} scheduling`, n.blurb)),
    ].join("\n"),
    `## AI tools (MCP)`,
    [
      `- Hosted MCP server: ${MCP_URL} (OAuth sign-in, no API key needed). Also on npm as @postbasehq/mcp for API-key setups.`,
      `- Tools: list_channels, create_post (single posts or threads, scheduled or as a draft), list_scheduled, cancel_post.`,
      link("/mcp", "The MCP server", "endpoint, sign-in, tools and limits"),
      ...MCP_NETWORKS.map((m) => link(`/mcp/${m.slug}`, m.metaTitle)),
      link("/ai", "Connect an AI tool"),
      ...CLIENTS.map((c) => link(`/ai/${c.slug}`, `Postbase in ${c.name}`)),
      link("/tools/mcp-config", "MCP config generator"),
    ].join("\n"),
    `## Docs`,
    [
      `- [Documentation](${DOCS}/general/introduction)`,
      `- [API reference: posts](${DOCS}/api/posts)`,
      `- [API authentication](${DOCS}/api/authentication)`,
      `- [Docs for LLMs](${DOCS}/llms-full.txt)`,
    ].join("\n"),
    `## Who it's for`,
    PERSONAS.map((p) => link(`/for/${p.slug}`, `Postbase for ${p.name.toLowerCase()}`)).join("\n"),
    `## Comparisons`,
    COMPETITORS.map((c) => link(`/alternatives/${c.slug}`, `Postbase vs ${c.name}`)).join("\n"),
    `## Guides`,
    posts.map((p) => link(`/blog/${p.slug}`, p.title, p.description)).join("\n"),
    `## Free tools`,
    [
      link("/tools/character-counter", "Character counter", "counts the way X, Bluesky and LinkedIn do, and splits threads"),
      link("/tools/social-media-image-sizes", "Social media image and video sizes"),
    ].join("\n"),
  ];
  if (full) {
    parts.push(
      `## Network limits`,
      live.map((n) => `### ${n.name}\n${n.facts.map((f) => `- ${f.label}: ${f.value}`).join("\n")}`).join("\n\n"),
      pricingMarkdown().replace(/^# /, "## "),
      `## Company`,
      `Postbase is run by Berkway Group Limited (UK). Contact: team@postbase.so. Source: https://github.com/postbasehq. X: https://x.com/postbasehq.`,
    );
  }
  return parts.join("\n\n") + "\n";
}

export const textResponse = (body: string, type = "text/plain") =>
  new Response(body, {
    headers: { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
