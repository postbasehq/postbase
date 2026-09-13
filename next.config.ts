import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow build verification to target a separate output dir (NEXT_DIST_DIR) so it
  // never clobbers a running `next dev` server's .next. Defaults to ".next".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Keep sharp (native) external so its binaries are traced into the serverless
  // function that transcodes images for Instagram publishing.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
