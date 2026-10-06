import { describe, expect, it } from "vitest";
import { renderSafeMarkdown } from "@/lib/safe-markdown";
import { isSafeRedirectUri } from "@/lib/oauth";

/** What an HTML parser does to an attribute value: decode entities once. */
function decodeAttribute(v: string): string {
  return v
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

describe("agent chat markdown is rendered safely", () => {
  const vectors = [
    "<img src=x onerror=alert(1)>",
    "<script>alert(1)</script>",
    "[x](javascript:alert(1))",
    "[x](&#106;avascript:alert(1))",
    "[x](javascript&#58;alert(1))",
    "[x](JaVa\tScRiPt:alert(1))",
    "[x](data:text/html,<script>alert(1)</script>)",
    "![x](javascript:alert(1))",
    "[x][r]\n\n[r]: javascript:alert(1)",
    "<details open ontoggle=alert(1)>",
    '<a href="javascript:alert(1)">x</a>',
  ];
  it.each(vectors)("neutralises %s", (v) => {
    const html = renderSafeMarkdown(v);
    expect(html).not.toMatch(/<(script|img src=x|details|iframe)/i);
    // Resolve every href/src the way a browser does (decode the attribute's
    // entities once, then parse the URL): only http(s) and mailto may remain.
    for (const m of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
      expect(new URL(decodeAttribute(m[1]), "https://www.postbase.so/agent").protocol).toMatch(/^(https?|mailto):$/);
    }
  });
  it("still renders ordinary markdown", () => {
    expect(renderSafeMarkdown("**bold** [ok](https://postbase.so/a?x=1&y=2)")).toContain('<a href="https://postbase.so/a?x=1&amp;y=2">ok</a>');
  });
});

describe("MCP OAuth redirect URIs", () => {
  it.each(["javascript:alert(1)//", "JavaScript:x", "data:text/html,x", "vbscript:x", "http://evil.com/cb", "file:///etc/passwd", "nope"])(
    "rejects %s",
    (u) => expect(isSafeRedirectUri(u)).toBe(false),
  );
  it.each(["https://claude.ai/api/mcp/auth_callback", "http://localhost:33418/cb", "http://127.0.0.1:5000/cb", "http://[::1]:8080/cb", "cursor://anysphere.cursor-mcp/oauth/callback"])(
    "accepts %s",
    (u) => expect(isSafeRedirectUri(u)).toBe(true),
  );
});
