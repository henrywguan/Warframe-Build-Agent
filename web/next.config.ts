import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the web app self-contained for easy Vercel/mobile deploys.
  // Standalone output is used by the repo-root Dockerfile (Fly / Docker / VPS).
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  /**
   * Dev-only: allow cross-origin HMR / `/_next/*` from phones on the LAN.
   * Does not apply to `next start` (no webpack HMR). See docs/web-chat.md.
   */
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
  ],
};

export default nextConfig;
