import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

export type LegalDoc = {
  title: string;
  updated: string | null;
  html: string;
  headings: { id: string; text: string }[];
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Render a Markdown file from the repo's /legal folder. legal/*.md stays the
 * single source of truth for /privacy and /terms. The leading `# Title` and
 * `**Last updated: …**` line are lifted out for the page header, and each `##`
 * section gets an id so the contents list can link to it.
 */
export async function renderLegal(file: string): Promise<LegalDoc> {
  const raw = await readFile(path.join(process.cwd(), "legal", file), "utf8");
  let md = raw.replace(/<!--[\s\S]*?-->/g, ""); // strip internal draft comments

  const titleMatch = md.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "";
  if (titleMatch) md = md.replace(titleMatch[0], "");
  const updatedMatch = md.match(/^\*\*Last updated:\s*(.+?)\*\*\s*$/m);
  const updated = updatedMatch ? updatedMatch[1].trim() : null;
  if (updatedMatch) md = md.replace(updatedMatch[0], "");

  const headings: { id: string; text: string }[] = [];
  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth, text }) => {
    const inner = marked.Parser.parseInline(tokens);
    if (depth === 2) {
      const id = slug(text);
      headings.push({ id, text });
      return `<h2 id="${id}"><a href="#${id}">${inner}</a></h2>\n`;
    }
    return `<h${depth}>${inner}</h${depth}>\n`;
  };

  const html = marked.parse(md.trim(), { gfm: true, async: false, renderer }) as string;
  return { title, updated, html, headings };
}
