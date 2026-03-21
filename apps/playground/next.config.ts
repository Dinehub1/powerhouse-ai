import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@powerhouse-ai/core",
    "@powerhouse-ai/workflow",
    "@powerhouse-ai/sandbox",
  ],
};

export default nextConfig;
