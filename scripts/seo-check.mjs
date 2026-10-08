#!/usr/bin/env node
/*
 * Daily technical SEO pass: can every page in the sitemap be crawled,
 * rendered and indexed? Fetches the live site the way Googlebot would (no JS),
 * and checks robots.txt, status codes and redirects, noindex (meta and
 * header), canonicals, server-rendered content, titles and descriptions,
 * JSON-LD, share images, internal links that break, orphan pages and public
 * pages missing from the sitemap.
 *
 *   node scripts/seo-check.mjs [base-url] [--json report.json] [--md report.md]
 *                              [--indexnow state.json]
 *
 * With --indexnow, pages whose content changed since the last run (or are new)
 * are submitted to IndexNow (Bing, Yandex, Seznam…; Bing feeds ChatGPT search
 * and Copilot). The key file is public/<key>.txt; the state file remembers a
 * hash of each page between runs.
 *
 * Exits 1 when anything blocks indexing (errors); warnings don't fail it.
 * No dependencies: our pages are server-rendered, so plain HTML parsing is enough.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const BASE = (args.find((a) => /^https?:\/\//.test(a)) ?? "https://www.postbase.so").replace(/\/+$/, "");
const ORIGIN = new URL(BASE).origin;
/** Against a local server, URLs in the sitemap and canonicals still say the production origin. */
const LOCAL = /^(localhost|127\.0\.0\.1)(:|$)/.test(new URL(BASE).host);
const SITE = LOCAL ? "https://www.postbase.so" : ORIGIN;
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const CONCURRENCY = Number(flag("--concurrency") ?? 6);

/** Buyer-intent pages: someone choosing or comparing a tool. Held to the strictest checks. */
const BUYER = [/^\/$/, /^\/pricing$/, /^\/developers$/, /^\/integrations(\/|$)/, /^\/alternatives(\/|$)/, /^\/mcp(\/|$)/, /^\/ai(\/|$)/, /^\/for\//, /^\/tools(\/|$)/];
const isBuyer = (path) => BUYER.some((r) => r.test(path));
/** Fewer words than this in the server HTML means the page relies on JS to show its content. */
const MIN_WORDS = { buyer: 250, other: 120 };

const issues = [];
const add = (level, path, check, detail) => issues.push({ level, path, check, detail });

async function get(url, opts = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA, accept: "text/html,*/*" }, ...opts });
    const body = opts.method === "HEAD" ? "" : await res.text();
    return { res, body, ms: Date.now() - t0 };
  } catch (e) {
    return { res: null, body: "", ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

async function pool(items, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const n = i++;
        out[n] = await fn(items[n]);
      }
    }),
  );
  return out;
}

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, " ");
const attr = (tag, name) => decode(tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ?? tag.match(new RegExp(`\\s${name}\\s*=\\s*'([^']*)'`, "i"))?.[1] ?? "");
const metaContent = (html, key, by = "name") => {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) if (attr(m[0], by).toLowerCase() === key) return attr(m[0], "content");
  return null;
};
const normPath = (u) => {
  const p = new URL(u, ORIGIN).pathname.replace(/\/+$/, "");
  return p === "" ? "/" : p;
};

// ── robots.txt ────────────────────────────────────────────────────────────
function parseRobots(txt) {
  // Rules for "*" (we don't serve Googlebot different rules).
  const groups = [];
  let cur = null;
  for (const raw of txt.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, k, v] = m;
    if (k.toLowerCase() === "user-agent") {
      if (!cur || cur.rules.length) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(v.toLowerCase());
    } else if (cur && /^(allow|disallow)$/i.test(k) && v) cur.rules.push({ allow: k.toLowerCase() === "allow", path: v });
  }
  const g = groups.find((x) => x.agents.includes("googlebot")) ?? groups.find((x) => x.agents.includes("*"));
  return g?.rules ?? [];
}
function robotsAllows(rules, path) {
  // Longest match wins; allow wins ties (Google's rules).
  let best = null;
  for (const r of rules) {
    const re = new RegExp("^" + r.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (re.test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

// ── page checks ───────────────────────────────────────────────────────────
function checkPage(path, url, { res, body, ms, error }, seen) {
  const buyer = isBuyer(path);
  const page = { path, buyer, status: res?.status ?? 0, ms, links: [], title: "", description: "", ogImage: null };
  if (!res) return add("error", path, "fetch", `request failed: ${error}`), page;
  if (res.status >= 300 && res.status < 400) {
    add("error", path, "status", `${res.status} redirect to ${res.headers.get("location")}: the sitemap should list the final URL`);
    return page;
  }
  if (res.status !== 200) return add("error", path, "status", `HTTP ${res.status}`), page;
  if (ms > 2500) add("warn", path, "speed", `server took ${ms} ms (Googlebot crawls slow sites less)`);

  const xr = res.headers.get("x-robots-tag") ?? "";
  if (/noindex|none/i.test(xr)) add("error", path, "noindex", `X-Robots-Tag: ${xr}`);
  const robotsMeta = [metaContent(body, "robots"), metaContent(body, "googlebot")].filter(Boolean).join(", ");
  if (/noindex|none/i.test(robotsMeta)) add("error", path, "noindex", `meta robots "${robotsMeta}"`);

  // Canonical: present, absolute, on this host, pointing at itself.
  const canon = [...body.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => /rel\s*=\s*["']canonical["']/i.test(t)).map((t) => attr(t, "href"));
  if (canon.length === 0) add(buyer ? "error" : "warn", path, "canonical", "no canonical link");
  else if (canon.length > 1) add("error", path, "canonical", `${canon.length} canonical links`);
  else {
    let c;
    try {
      c = new URL(canon[0]);
    } catch {
      add("error", path, "canonical", `invalid canonical "${canon[0]}"`);
    }
    if (c && (c.origin !== SITE || normPath(c.href) !== path)) add("error", path, "canonical", `canonical points elsewhere: ${canon[0]}`);
  }

  // Title and description.
  page.title = decode(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
  if (!page.title) add("error", path, "title", "no <title>");
  else if (page.title.length > 70) add("warn", path, "title", `${page.title.length} characters (Google shows ~60): "${page.title}"`);
  page.description = metaContent(body, "description") ?? "";
  if (!page.description) add(buyer ? "error" : "warn", path, "description", "no meta description");
  else if (page.description.length > 170) add("warn", path, "description", `${page.description.length} characters (Google shows ~155)`);
  else if (page.description.length < 50) add("warn", path, "description", `only ${page.description.length} characters`);

  // Rendered without JS: the headline and the bulk of the copy are in the HTML.
  const h1s = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim());
  if (h1s.length === 0) add(buyer ? "error" : "warn", path, "render", "no <h1> in the server HTML");
  else if (h1s.length > 1) add("warn", path, "h1", `${h1s.length} <h1> elements`);
  const main = body.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? body;
  const text = decode(
    main
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
  const words = text.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  page.words = words;
  page.hash = createHash("sha1").update(`${page.title}\n${page.description}\n${text.replace(/\s+/g, " ")}`).digest("hex");
  const min = buyer ? MIN_WORDS.buyer : MIN_WORDS.other;
  if (words < min) add(buyer ? "error" : "warn", path, "render", `only ${words} words in the server-rendered <main> (want ${min}+); content may need JavaScript`);
  if (/<html\b[^>]*>/.test(body) && !/<html\b[^>]*\slang=/i.test(body)) add("warn", path, "lang", "<html> has no lang");

  // Structured data must parse, or Google drops it.
  for (const m of body.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      add("error", path, "schema", `JSON-LD doesn't parse: ${e.message}`);
    }
  }
  if (buyer && !/application\/ld\+json/i.test(body)) add("warn", path, "schema", "no JSON-LD");

  page.ogImage = metaContent(body, "og:image", "property");
  if (!page.ogImage) add("warn", path, "og:image", "no og:image");

  // Internal links, for orphans and broken links.
  for (const m of body.matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(m[0], "href");
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    let u;
    try {
      u = new URL(href, url);
    } catch {
      continue;
    }
    if (u.origin !== ORIGIN && u.origin !== SITE) continue;
    const p = normPath(u.href);
    page.links.push(p);
    seen.add(p);
  }
  return page;
}

// ── run ───────────────────────────────────────────────────────────────────
async function main() {
  const started = new Date();

  // Host and protocol: one hop to the canonical origin.
  const host = new URL(BASE).host;
  const variants = LOCAL ? [] : [`http://${host}/`];
  if (!LOCAL && host.startsWith("www.")) variants.push(`https://${host.slice(4)}/`, `http://${host.slice(4)}/`);
  for (const v of variants) {
    const { res } = await get(v);
    const loc = res?.headers.get("location") ?? "";
    if (!res || res.status < 300 || res.status >= 400) add("error", v, "host", `expected a redirect to ${ORIGIN}/, got ${res?.status ?? "no response"}`);
    else if (![301, 308].includes(res.status)) add("warn", v, "host", `${res.status} redirect (use 301/308 so it's permanent)`);
    else if (new URL(loc, v).origin !== ORIGIN) add("warn", v, "host", `redirects to ${loc}, not straight to ${ORIGIN}`);
  }

  const robotsRes = await get(`${ORIGIN}/robots.txt`);
  if (robotsRes.res?.status !== 200) add("error", "/robots.txt", "robots", `HTTP ${robotsRes.res?.status}`);
  const rules = parseRobots(robotsRes.body);
  if (!/^sitemap:\s*\S+/im.test(robotsRes.body)) add("warn", "/robots.txt", "robots", "no Sitemap: line");

  const sm = await get(`${ORIGIN}/sitemap.xml`);
  if (sm.res?.status !== 200) {
    add("error", "/sitemap.xml", "sitemap", `HTTP ${sm.res?.status}`);
    return finish(started, [], rules);
  }
  const urls = [...sm.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decode(m[1]));
  if (urls.length === 0) add("error", "/sitemap.xml", "sitemap", "no <loc> entries");
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  if (dupes.length) add("warn", "/sitemap.xml", "sitemap", `duplicate entries: ${[...new Set(dupes)].join(", ")}`);
  for (const u of urls) {
    if (new URL(u).origin !== SITE) add("error", u, "sitemap", `listed on another origin than ${SITE}`);
    if (!robotsAllows(rules, new URL(u).pathname)) add("error", normPath(u), "robots", "in the sitemap but disallowed by robots.txt");
  }

  const seen = new Set();
  const paths = [...new Set(urls.map(normPath))];
  const pages = await pool(paths, async (p) => checkPage(p, `${ORIGIN}${p === "/" ? "/" : p}`, await get(`${ORIGIN}${p}`), seen));
  return finish(started, pages, rules, seen, new Set(paths));
}

async function finish(started, pages, rules, seen = new Set(), inSitemap = new Set()) {
  // Duplicate titles and descriptions compete with each other.
  const by = (k) => {
    const m = new Map();
    for (const p of pages) if (p[k]) m.set(p[k], [...(m.get(p[k]) ?? []), p.path]);
    return [...m].filter(([, v]) => v.length > 1);
  };
  for (const [t, ps] of by("title")) add("warn", ps.join(", "), "duplicate title", t);
  for (const [d, ps] of by("description")) add("warn", ps.join(", "), "duplicate description", d.slice(0, 80));

  // Orphans: in the sitemap, linked from no other page.
  const linkedFrom = new Map();
  for (const p of pages) for (const l of new Set(p.links)) if (l !== p.path) linkedFrom.set(l, (linkedFrom.get(l) ?? 0) + 1);
  for (const p of pages) if (p.path !== "/" && !linkedFrom.get(p.path)) add(p.buyer ? "error" : "warn", p.path, "orphan", "no other page links here; crawlers find it only through the sitemap");

  // Linked public pages that aren't in the sitemap, or don't work.
  const extra = [...seen].filter((p) => !inSitemap.has(p) && robotsAllows(rules, p) && !/\.(png|jpe?g|svg|xml|txt|md|ico|webp)$/i.test(p));
  const checked = await pool(extra, async (p) => ({ p, r: await get(`${ORIGIN}${p}`) }));
  for (const { p, r } of checked) {
    const s = r.res?.status ?? 0;
    if (s >= 400 || s === 0) add("error", p, "broken link", `HTTP ${s || "no response"}, linked from ${pages.filter((x) => x.links.includes(p)).map((x) => x.path).slice(0, 3).join(", ")}`);
    else if (s === 200) {
      const noindex = /noindex/i.test(r.res.headers.get("x-robots-tag") ?? "") || /noindex/i.test(metaContent(r.body, "robots") ?? "");
      if (!noindex) add("warn", p, "sitemap", "linked and indexable but not in the sitemap");
    }
  }

  // Share images resolve (one per unique URL).
  const images = [...new Set(pages.map((p) => p.ogImage).filter(Boolean))];
  const imgs = await pool(images, async (u) => ({ u, r: await get(u, { method: "HEAD" }) }));
  for (const { u, r } of imgs) {
    if (r.res?.status !== 200) add("warn", pages.find((p) => p.ogImage === u)?.path ?? u, "og:image", `HTTP ${r.res?.status ?? "no response"} for ${u}`);
  }

  const indexnow = flag("--indexnow") && !LOCAL ? await indexNow(pages, flag("--indexnow")) : null;
  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");
  const buyerPages = pages.filter((p) => p.buyer);
  const summary = {
    base: ORIGIN,
    ranAt: started.toISOString(),
    pages: pages.length,
    buyerPages: buyerPages.length,
    buyerPagesClean: buyerPages.filter((p) => !errors.some((e) => e.path === p.path)).length,
    errors: errors.length,
    warnings: warns.length,
    slowest: [...pages].sort((a, b) => b.ms - a.ms).slice(0, 3).map((p) => `${p.path} ${p.ms}ms`),
    indexnow,
  };

  const md = [
    `# Technical SEO pass: ${ORIGIN}`,
    ``,
    `${summary.ranAt} · ${summary.pages} pages in the sitemap · buyer-intent pages clean: ${summary.buyerPagesClean}/${summary.buyerPages} · ${summary.errors} errors · ${summary.warnings} warnings`,
    ``,
    errors.length ? `## Errors (block crawling or indexing)\n\n${errors.map((i) => `- \`${i.path}\` **${i.check}**: ${i.detail}`).join("\n")}` : `## Errors\n\nNone.`,
    ``,
    warns.length ? `## Warnings\n\n${warns.map((i) => `- \`${i.path}\` ${i.check}: ${i.detail}`).join("\n")}` : `## Warnings\n\nNone.`,
    ``,
    `Slowest: ${summary.slowest.join(", ")}`,
    summary.indexnow ? `\nIndexNow: ${summary.indexnow}` : ``,
  ].join("\n");

  if (flag("--json")) fs.writeFileSync(flag("--json"), JSON.stringify({ summary, issues, pages: pages.map(({ links, ...p }) => p) }, null, 2));
  if (flag("--md")) fs.writeFileSync(flag("--md"), md + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  console.log(md);
  process.exitCode = errors.length ? 1 : 0;
}

/** Submit new and changed pages to IndexNow, then remember what was sent. */
async function indexNow(pages, statePath) {
  const keyFile = fs.readdirSync(new URL("../public/", import.meta.url)).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (!keyFile) return "skipped (no key file in public/)";
  const key = keyFile.slice(0, -4);
  let state = {};
  try {
    state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    /* first run */
  }
  const broken = new Set(issues.filter((i) => i.level === "error").map((i) => i.path));
  const changed = pages.filter((p) => p.hash && !broken.has(p.path) && state[p.path] !== p.hash);
  if (changed.length === 0) return "nothing changed";
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(ORIGIN).host,
      key,
      keyLocation: `${ORIGIN}/${keyFile}`,
      urlList: changed.map((p) => `${ORIGIN}${p.path === "/" ? "/" : p.path}`),
    }),
  }).catch((e) => ({ ok: false, status: e.message }));
  // 200 and 202 both mean accepted; only remember pages once they're in.
  if (res.ok) {
    for (const p of changed) state[p.path] = p.hash;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 1));
    return `submitted ${changed.length} new or changed page${changed.length === 1 ? "" : "s"} (HTTP ${res.status})`;
  }
  add("warn", "/indexnow", "indexnow", `submission failed: HTTP ${res.status}`);
  return `failed (HTTP ${res.status})`;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 2;
});
