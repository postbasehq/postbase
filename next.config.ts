import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow build verification to target a separate output dir (NEXT_DIST_DIR) so it
  // never clobbers a running `next dev` server's .next. Defaults to ".next".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Keep sharp (native) external so its binaries are traced into the serverless
  // function that transcodes images for Instagram publishing.
  serverExternalPackages: ["sharp"],
  // Next's router ignores leading-dot folders, so the OAuth discovery documents
  // live under /well-known/* and are exposed at the real /.well-known/* paths
  // (RFC 8414 / 9728) via rewrites. The protected-resource doc also answers any
  // resource-suffixed path that MCP clients probe.
  async rewrites() {
    return [
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
    ];
  },
};

export default nextConfig;
