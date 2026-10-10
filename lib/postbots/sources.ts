import type { ListenSource } from "@/lib/postbots/types";

/*
 * Free, public sources a Listen bot searches. No platform permissions and no
 * paid APIs: X and LinkedIn search are paid or closed, and Meta/YouTube reads
 * would need new app reviews. Every fetch is bounded (timeout, result count)
 * and a failing source never fails the sweep, it's just reported as skipped.
 */

export type RawItem = {
  source: ListenSource;
  /** Stable id within the source, for "already seen" checks. */
  externalId: string;
  url: string;
  title: string;
  text: string;
  author: string | null;
  publishedAt: string | null;
};

const UA = "Postbots/0.1 (+https://www.postbase.so)";
const TIMEOUT_MS = 8000;
const PER_QUERY = 15;

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { "User-Agent": UA, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Strip tags and decode the handful of entities feeds and HN actually use. */
export function plainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** The inner text of the first <tag> in an XML fragment ("" if absent). */
export function tagText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeEntities(m[1]).trim() : "";
}

function blocks(xml: string, tag: string): string[] {
  return xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, "gi")) ?? [];
}

const isoOrNull = (v: string | number | null | undefined): string | null => {
  if (v == null || v === "") return null;
  const d = new Date(typeof v === "number" ? v * 1000 : v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/* ── Hacker News (Algolia search API) ─────────────────────────────── */

type HnHit = {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  comment_text?: string | null;
  story_text?: string | null;
  url?: string | null;
  author?: string | null;
  created_at_i?: number;
};

async function hackerNews(query: string, since: Date): Promise<RawItem[]> {
  const url = new URL("https://hn.algolia.com/api/v1/search_by_date");
  url.searchParams.set("query", query);
  url.searchParams.set("tags", "(story,comment)");
  url.searchParams.set("typoTolerance", "false");
  url.searchParams.set("hitsPerPage", String(PER_QUERY));
  url.searchParams.set("numericFilters", `created_at_i>${Math.floor(since.getTime() / 1000)}`);
  const res = await get(url.toString());
  if (!res.ok) throw new Error(`Hacker News answered ${res.status}`);
  const data = (await res.json()) as { hits?: HnHit[] };
  return (data.hits ?? []).map((h) => ({
    source: "hackernews" as const,
    externalId: h.objectID,
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    title: h.title || (h.story_title ? `Comment on: ${h.story_title}` : "Hacker News comment"),
    text: clip(plainText(h.comment_text || h.story_text || h.url || ""), 600),
    author: h.author ?? null,
    publishedAt: isoOrNull(h.created_at_i),
  }));
}

/* ── Bluesky (public AppView search) ──────────────────────────────── */

type BskyPost = {
  uri: string;
  author?: { handle?: string };
  record?: { text?: string; createdAt?: string };
  indexedAt?: string;
};

async function bluesky(query: string, since: Date): Promise<RawItem[]> {
  const url = new URL("https://api.bsky.app/xrpc/app.bsky.feed.searchPosts");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "latest");
  url.searchParams.set("limit", String(PER_QUERY));
  url.searchParams.set("since", since.toISOString());
  const res = await get(url.toString());
  if (!res.ok) throw new Error(`Bluesky answered ${res.status}`);
  const data = (await res.json()) as { posts?: BskyPost[] };
  return (data.posts ?? []).map((p) => {
    const rkey = p.uri.split("/").pop() ?? "";
    const handle = p.author?.handle ?? "";
    const text = p.record?.text ?? "";
    return {
      source: "bluesky" as const,
      externalId: p.uri,
      url: handle ? `https://bsky.app/profile/${handle}/post/${rkey}` : "https://bsky.app",
      title: clip(text.split("\n")[0] || "Bluesky post", 120),
      text: clip(text, 600),
      author: handle ? `@${handle}` : null,
      publishedAt: isoOrNull(p.record?.createdAt ?? p.indexedAt),
    };
  });
}

/* ── Google News (RSS search) ─────────────────────────────────────── */

async function googleNews(query: string, since: Date): Promise<RawItem[]> {
  const days = Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86_400_000));
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", `"${query}" when:${days}d`);
  url.searchParams.set("hl", "en-GB");
  url.searchParams.set("gl", "GB");
  url.searchParams.set("ceid", "GB:en");
  const res = await get(url.toString());
  if (!res.ok) throw new Error(`Google News answered ${res.status}`);
  return parseNewsRss(await res.text()).slice(0, PER_QUERY);
}

export function parseNewsRss(xml: string): RawItem[] {
  return blocks(xml, "item").map((item) => {
    const link = tagText(item, "link");
    return {
      source: "news" as const,
      externalId: tagText(item, "guid") || link,
      url: link,
      title: tagText(item, "title"),
      text: clip(plainText(tagText(item, "description")), 400),
      author: tagText(item, "source") || null,
      publishedAt: isoOrNull(tagText(item, "pubDate")),
    };
  });
}

/* ── Reddit (official API when keys are set, else the public RSS) ─── */

let redditToken: { value: string; expires: number } | null = null;

async function redditAccessToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (redditToken && redditToken.expires > Date.now() + 60_000) return redditToken.value;
  const res = await get("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  redditToken = { value: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return redditToken.value;
}

type RedditChild = {
  data: {
    name: string;
    title?: string;
    selftext?: string;
    permalink?: string;
    author?: string;
    subreddit_name_prefixed?: string;
    created_utc?: number;
  };
};

async function reddit(query: string, since: Date): Promise<RawItem[]> {
  const window = Date.now() - since.getTime() > 2 * 86_400_000 ? "week" : "day";
  const token = await redditAccessToken();
  if (token) {
    const url = new URL("https://oauth.reddit.com/search");
    url.searchParams.set("q", `"${query}"`);
    url.searchParams.set("sort", "new");
    url.searchParams.set("t", window);
    url.searchParams.set("limit", String(PER_QUERY));
    const res = await get(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Reddit answered ${res.status}`);
    const data = (await res.json()) as { data?: { children?: RedditChild[] } };
    return (data.data?.children ?? []).map(({ data: d }) => ({
      source: "reddit" as const,
      externalId: d.name,
      url: `https://www.reddit.com${d.permalink ?? ""}`,
      title: d.title ?? "Reddit post",
      text: clip(d.selftext ?? "", 600),
      author: d.subreddit_name_prefixed ?? (d.author ? `u/${d.author}` : null),
      publishedAt: isoOrNull(d.created_utc),
    }));
  }
  const url = new URL("https://www.reddit.com/search.rss");
  url.searchParams.set("q", `"${query}"`);
  url.searchParams.set("sort", "new");
  url.searchParams.set("t", window);
  const res = await get(url.toString());
  if (!res.ok) throw new Error(`Reddit answered ${res.status}`);
  return parseRedditAtom(await res.text()).slice(0, PER_QUERY);
}

export function parseRedditAtom(xml: string): RawItem[] {
  return blocks(xml, "entry").map((entry) => {
    const href = entry.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "";
    const sub = entry.match(/<category[^>]*label="([^"]+)"/i)?.[1] ?? null;
    return {
      source: "reddit" as const,
      externalId: tagText(entry, "id") || href,
      url: decodeEntities(href),
      title: tagText(entry, "title"),
      text: clip(plainText(tagText(entry, "content")), 600),
      author: sub ?? (tagText(entry, "name") || null),
      publishedAt: isoOrNull(tagText(entry, "published") || tagText(entry, "updated")),
    };
  });
}

/* ── Run every source for every keyword ───────────────────────────── */

const FETCHERS: Record<ListenSource, (q: string, since: Date) => Promise<RawItem[]>> = {
  hackernews: hackerNews,
  reddit,
  bluesky,
  news: googleNews,
};

export type SearchResult = { items: RawItem[]; failed: ListenSource[] };

/** True when the item literally contains one of the keywords. Search engines
 *  match loosely (typos, stems: "Postbase" finds "postage"), so this keeps
 *  only real mentions before anything reaches the model. */
export function mentionsAny(item: RawItem, keywords: string[]): boolean {
  const hay = `${item.title} ${item.text} ${item.url}`.toLowerCase();
  return keywords.some((k) => k.trim() && hay.includes(k.trim().toLowerCase()));
}

/** Search each source for each keyword, deduped by source + id. */
export async function searchSources(
  sources: ListenSource[],
  keywords: string[],
  since: Date,
): Promise<SearchResult> {
  const jobs = sources.flatMap((s) => keywords.map((k) => ({ s, k })));
  const settled = await Promise.allSettled(jobs.map(({ s, k }) => FETCHERS[s](k, since)));
  const seen = new Set<string>();
  const items: RawItem[] = [];
  const failed = new Set<ListenSource>();
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      failed.add(jobs[i].s);
      return;
    }
    for (const item of r.value) {
      const key = `${item.source}:${item.externalId}`;
      if (!item.url || seen.has(key) || !mentionsAny(item, keywords)) continue;
      seen.add(key);
      items.push(item);
    }
  });
  // A source only counts as failed when none of its keyword searches worked.
  const worked = new Set(settled.flatMap((r, i) => (r.status === "fulfilled" ? [jobs[i].s] : [])));
  return { items, failed: [...failed].filter((s) => !worked.has(s)) };
}
