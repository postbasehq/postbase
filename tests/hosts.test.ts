import { describe, expect, it } from "vitest";
import { botsHref, cleanBotsPath, cookieDomainFor, hostConfig, routeHost, type HostConfig } from "@/lib/hosts";
import { botsCheckoutUrls } from "@/lib/stripe";

const on: HostConfig = hostConfig({
  NEXT_PUBLIC_APP_HOST: "app.postbase.so",
  NEXT_PUBLIC_BOTS_HOST: "bots.postbase.so",
  NEXT_PUBLIC_COOKIE_DOMAIN: ".postbase.so",
});
const off: HostConfig = hostConfig({});
const get = (host: string, path: string, search = "") => routeHost(on, host, "GET", path, search);

describe("host split", () => {
  it("does nothing until the app and bots hosts are set", () => {
    expect(routeHost(off, "www.postbase.so", "GET", "/calendar", "")).toEqual({ kind: "next" });
    expect(cookieDomainFor(off, "www.postbase.so")).toBeNull();
  });

  it("moves app pages from www to the app host, keeping the query", () => {
    expect(get("www.postbase.so", "/billing", "?plan=team")).toEqual({ kind: "redirect", url: "https://app.postbase.so/billing?plan=team" });
    expect(get("postbase.so", "/calendar")).toEqual({ kind: "redirect", url: "https://app.postbase.so/calendar" });
    expect(get("www.postbase.so", "/pricing")).toEqual({ kind: "next" });
  });

  it("sends Postbots to the bots host at clean paths", () => {
    expect(get("www.postbase.so", "/bots/abc")).toEqual({ kind: "redirect", url: "https://bots.postbase.so/abc" });
    expect(get("app.postbase.so", "/bots")).toEqual({ kind: "redirect", url: "https://bots.postbase.so/" });
    expect(get("bots.postbase.so", "/bots/abc")).toEqual({ kind: "redirect", url: "https://bots.postbase.so/abc" });
    expect(get("bots.postbase.so", "/abc")).toEqual({ kind: "rewrite", path: "/bots/abc" });
    expect(get("bots.postbase.so", "/")).toEqual({ kind: "rewrite", path: "/bots" });
  });

  it("serves the app host its own pages and sends marketing pages home", () => {
    expect(get("app.postbase.so", "/")).toEqual({ kind: "redirect", url: "https://app.postbase.so/calendar" });
    expect(get("app.postbase.so", "/composer")).toEqual({ kind: "next" });
    expect(get("app.postbase.so", "/pricing")).toEqual({ kind: "redirect", url: "https://www.postbase.so/pricing" });
    expect(get("bots.postbase.so", "/billing")).toEqual({ kind: "redirect", url: "https://app.postbase.so/billing" });
  });

  it("keeps sign-in, the API, MCP OAuth and invites on every host", () => {
    for (const host of ["www.postbase.so", "app.postbase.so", "bots.postbase.so"]) {
      for (const path of ["/login", "/auth/callback", "/api/connect/x/callback", "/oauth/authorize", "/invite/t0k"]) {
        expect(get(host, path)).toEqual({ kind: "next" });
      }
    }
  });

  it("never redirects a POST, so server actions run where they were sent", () => {
    expect(routeHost(on, "www.postbase.so", "POST", "/calendar", "")).toEqual({ kind: "next" });
    expect(routeHost(on, "bots.postbase.so", "POST", "/abc", "")).toEqual({ kind: "rewrite", path: "/bots/abc" });
  });

  it("leaves previews, localhost and the MCP host alone", () => {
    for (const host of ["postbase-git-main.vercel.app", "localhost:3000", "mcp.postbase.so"]) {
      expect(get(host, "/calendar")).toEqual({ kind: "next" });
    }
  });

  it("shares the sign-in cookie only on hosts under the cookie domain", () => {
    expect(cookieDomainFor(on, "app.postbase.so")).toBe(".postbase.so");
    expect(cookieDomainFor(on, "postbase.so")).toBe(".postbase.so");
    expect(cookieDomainFor(on, "postbase-git-main.vercel.app")).toBeNull();
    expect(cookieDomainFor(on, "localhost:3000")).toBeNull();
  });

  it("writes Postbots paths the bots host's way", () => {
    expect(cleanBotsPath("/bots")).toBe("/");
    expect(cleanBotsPath("/bots/new")).toBe("/new");
    expect(cleanBotsPath("/botsy")).toBe("/botsy");
    // No split in tests' env: links stay as they are.
    expect(botsHref("/bots/abc")).toBe("/bots/abc");
  });

  it("brings checkout started in Postbots back to Postbots", () => {
    // One host in tests: Postbots is at /bots on the app URL.
    expect(botsCheckoutUrls().success).toMatch(/\/bots\?checkout=success$/);
    expect(botsCheckoutUrls().cancel).toMatch(/\/bots$/);
  });
});
