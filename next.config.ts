import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep sharp (native) external so its binaries are traced into the serverless
  // function that transcodes images for Instagram publishing.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
