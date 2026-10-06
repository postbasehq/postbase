import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";

/*
 * The changelog: one Markdown file per change in /content/changelog, with a
 * small front-matter block:
 *
 *   ---
 *   title: Two-factor sign-in
 *   date: 2026-10-06
 *   type: new                 (new | improved | fixed)
 *   area: Security            (one of AREAS)
 *   summary: One line for the list and search results.
 *   demo: twofa               (optional: a product slice, see ChangelogDemo)
 *   headline: true            (optional: the week's lead entry, on a brand tile)
 *   draft: true               (optional: written but not published yet)
 *   ---
 *
 * The body is a short explanation. Entries are grouped by the week (Monday)
 * they shipped. Drafts come from the weekly drafting task and stay hidden
 * until someone removes `draft: true`.
 */

export const TYPES = ["new", "improved", "fixed"] as const;
export type ChangeType = (typeof TYPES)[number];

export const AREAS = ["AI", "Publishing", "Calendar", "Analytics", "Media", "Team", "Developers", "Security", "Account", "Mobile"] as const;
export type Area = (typeof AREAS)[number];

export const DEMOS = ["agent", "youtube", "calendar", "twofa", "mcp"] as const;
export type Demo = (typeof DEMOS)[number];

export type Entry = {
  slug: string;
  title: string;
  date: string;
  type: ChangeType;
  area: Area;
  summary: string;
  demo?: Demo;
  headline: boolean;
  html: string;
};

export type Week = { monday: string; label: string; entries: Entry[] };

const DIR = path.join(process.cwd(), "content", "changelog");

function parse(file: string): (Entry & { draft: boolean }) | null {
  const raw = readFileSync(path.join(DIR, file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`content/changelog/${file}: missing front matter`);
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$|^'(.*)'$/, "$1$2");
  }
  for (const key of ["title", "date", "type", "area", "summary"]) {
    if (!fm[key]) throw new Error(`content/changelog/${file}: front matter needs "${key}"`);
  }
  if (!TYPES.includes(fm.type as ChangeType)) throw new Error(`content/changelog/${file}: unknown type "${fm.type}"`);
  if (!AREAS.includes(fm.area as Area)) throw new Error(`content/changelog/${file}: unknown area "${fm.area}"`);
  if (fm.demo && !DEMOS.includes(fm.demo as Demo)) throw new Error(`content/changelog/${file}: unknown demo "${fm.demo}"`);
  return {
    slug: file.replace(/\.md$/, ""),
    title: fm.title,
    date: fm.date,
    type: fm.type as ChangeType,
    area: fm.area as Area,
    summary: fm.summary,
    demo: (fm.demo as Demo) || undefined,
    headline: fm.headline === "true",
    draft: fm.draft === "true",
    html: marked.parse(m[2].trim(), { gfm: true, async: false }) as string,
  };
}

/** Published entries, newest first. */
export function listEntries(): Entry[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files
    .map(parse)
    .filter((e): e is Entry & { draft: boolean } => !!e && !e.draft)
    .map(({ draft: _draft, ...e }) => e)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
}

export const getEntry = (slug: string) => (/^[a-z0-9-]+$/.test(slug) ? listEntries().find((e) => e.slug === slug) ?? null : null);

/** The Monday of an ISO date's week, as an ISO date. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Entries grouped by week, newest week first; each week's headline entries lead. */
export function listWeeks(): Week[] {
  const weeks = new Map<string, Entry[]>();
  for (const e of listEntries()) {
    const k = mondayOf(e.date);
    weeks.set(k, [...(weeks.get(k) ?? []), e]);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([monday, entries]) => ({
      monday,
      label: `Week of ${formatDay(monday)}`,
      entries: [...entries].sort((a, b) => Number(b.headline) - Number(a.headline)),
    }));
}
