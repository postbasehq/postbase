import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";

/*
 * Blog posts are Markdown files in /content/blog, with a small front-matter
 * block:
 *
 *   ---
 *   title: How to post to X from Claude
 *   description: One or two sentences for search results and cards.
 *   date: 2026-09-26
 *   updated: 2026-10-02        (optional)
 *   category: AI agents        (one of CATEGORIES)
 *   related: /ai/claude, /integrations/x   (optional, pages to link at the end)
 *   ---
 *
 * A line of the form `::demo name key=value …` drops an animated product shot
 * into the post at that point (see components/marketing/blog/Demo.tsx).
 * Posts are ours, so the rendered HTML is trusted.
 */

export const CATEGORIES = ["AI agents", "Developers", "Guides"] as const;
export type Category = (typeof CATEGORIES)[number];

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  category: Category;
  related: string[];
  minutes: number;
};

export type Block = { kind: "html"; html: string } | { kind: "demo"; name: string; props: Record<string, string> };

export type Post = PostMeta & { blocks: Block[]; headings: { id: string; text: string }[] };

const DIR = path.join(process.cwd(), "content", "blog");

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function parse(file: string): { meta: PostMeta; body: string } {
  const raw = readFileSync(path.join(DIR, file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`content/blog/${file}: missing front matter`);
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  for (const key of ["title", "description", "date", "category"]) {
    if (!fm[key]) throw new Error(`content/blog/${file}: front matter needs "${key}"`);
  }
  if (!CATEGORIES.includes(fm.category as Category)) throw new Error(`content/blog/${file}: unknown category "${fm.category}"`);
  const body = m[2];
  const words = body.replace(/^::demo.*$/gm, "").split(/\s+/).filter(Boolean).length;
  return {
    meta: {
      slug: file.replace(/\.md$/, ""),
      title: fm.title,
      description: fm.description,
      date: fm.date,
      updated: fm.updated || undefined,
      category: fm.category as Category,
      related: fm.related ? fm.related.split(",").map((s) => s.trim()).filter(Boolean) : [],
      minutes: Math.max(1, Math.round(words / 230)),
    },
    body,
  };
}

/** All posts, newest first. */
export function listPosts(): PostMeta[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parse(f).meta)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPost(slug: string): Post | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  let parsed;
  try {
    parsed = parse(`${slug}.md`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  const { meta, body } = parsed;

  const headings: { id: string; text: string }[] = [];
  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth, text }) => {
    const inner = marked.Parser.parseInline(tokens);
    if (depth === 2) {
      const id = slugify(text);
      headings.push({ id, text: text.replace(/`/g, "") });
      return `<h2 id="${id}"><a href="#${id}">${inner}</a></h2>\n`;
    }
    return `<h${depth}>${inner}</h${depth}>\n`;
  };
  // External links open in a new tab; internal ones stay put.
  renderer.link = ({ href, title, tokens }) => {
    const inner = marked.Parser.parseInline(tokens);
    const ext = /^https?:\/\//.test(href) && !href.startsWith("https://www.postbase.so");
    return `<a href="${href}"${title ? ` title="${title}"` : ""}${ext ? ' target="_blank" rel="noopener"' : ""}>${inner}</a>`;
  };

  const blocks: Block[] = [];
  let buf: string[] = [];
  const flush = () => {
    const md = buf.join("\n").trim();
    if (md) blocks.push({ kind: "html", html: marked.parse(md, { gfm: true, async: false, renderer }) as string });
    buf = [];
  };
  for (const line of body.split("\n")) {
    const d = line.match(/^::demo\s+([a-z-]+)(.*)$/);
    if (d) {
      flush();
      const props: Record<string, string> = {};
      for (const [, k, v] of d[2].matchAll(/([a-z]+)=("[^"]*"|\S+)/g)) props[k] = v.replace(/^"|"$/g, "");
      blocks.push({ kind: "demo", name: d[1], props });
    } else {
      buf.push(line);
    }
  }
  flush();

  return { ...meta, blocks, headings };
}

export const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
