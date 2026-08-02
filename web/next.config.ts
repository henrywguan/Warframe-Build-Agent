import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the web app self-contained for easy Vercel/mobile deploys.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
