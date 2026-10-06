import { SITE_URL } from "@/lib/site";
import { listEntries } from "@/lib/changelog";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The changelog as an RSS 2.0 feed, newest first. */
export function GET() {
  const items = listEntries()
    .map(
      (e) => `    <item>
      <title>${esc(e.title)}</title>
      <link>${SITE_URL}/changelog/${e.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/changelog/${e.slug}</guid>
      <pubDate>${new Date(`${e.date}T12:00:00Z`).toUTCString()}</pubDate>
      <category>${esc(e.area)}</category>
      <description>${esc(e.summary)}</description>
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Postbase changelog</title>
    <link>${SITE_URL}/changelog</link>
    <atom:link href="${SITE_URL}/changelog/rss.xml" rel="self" type="application/rss+xml" />
    <description>New features, improvements and fixes in Postbase.</description>
    <language>en-gb</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
