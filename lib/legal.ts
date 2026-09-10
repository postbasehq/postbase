import { readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

/**
 * Render a Markdown file from the repo's /legal folder to HTML.
 * Keeps legal/*.md as the single source of truth for the /privacy and /terms pages.
 */
export async function renderLegal(file: string): Promise<string> {
  const raw = await readFile(path.join(process.cwd(), "legal", file), "utf8");
  const cleaned = raw.replace(/<!--[\s\S]*?-->/g, ""); // strip internal draft comments
  return marked.parse(cleaned, { gfm: true, async: false }) as string;
}
