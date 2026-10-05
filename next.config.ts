import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow build verification to target a separate output dir (NEXT_DIST_DIR) so it
  // never clobbers a running `next dev` server's .next. Defaults to ".next".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Keep sharp (native) external so its binaries are traced into the serverless
  // function that transcodes images for Instagram publishing.
  serverExternalPackages: ["sharp"],
  // Share images for dynamic pages render on demand and read these at runtime
  // (lib/og.tsx fonts + logo, lib/blog.ts posts), so make sure they're deployed.
  outputFileTracingIncludes: {
    "/**/*": ["./assets/fonts/**/*", "./public/postbase-icon.png", "./content/blog/**/*"],
  },
  // Next's router ignores leading-dot folders, so the OAuth discovery documents
  // live under /well-known/* and are exposed at the real /.well-known/* paths
  // (RFC 8414 / 9728) via rewrites. The protected-resource doc also answers any
  // resource-suffixed path that MCP clients probe.
  async rewrites() {
    // mcp.postbase.so serves the MCP server at /mcp (and /). beforeFiles so
    // "/" on that host doesn't hit the marketing homepage.
    const mcpHost = [{ type: "host" as const, value: process.env.MCP_HOST || "mcp.postbase.so" }];
    const beforeFiles = [
      { source: "/mcp", has: mcpHost, destination: "/api/mcp" },
      { source: "/", has: mcpHost, destination: "/api/mcp" },
    ];
    return { beforeFiles, afterFiles: [
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/well-known/oauth-authorization-server",
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: "/well-known/oauth-authorization-server",
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/well-known/oauth-protected-resource",
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: "/well-known/oauth-protected-resource",
      },
    ], fallback: [] };
  },
};

// Sentry's build plugin only uploads source maps (readable stack traces); error
// reporting works without it. Wrap only when a token is set, so builds without
// Sentry configured are unchanged.
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      telemetry: false,
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : nextConfig;
