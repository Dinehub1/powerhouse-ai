import type { NextConfig } from "next";
import path from "node:path";
import { config as dotenvConfig } from "dotenv";

// Load .env from monorepo root so OPENAI_API_KEY etc. are available
dotenvConfig({ path: path.resolve(__dirname, "../../.env"), override: false });

const nextConfig: NextConfig = {
  transpilePackages: [
    "@powerhouse-ai/core",
    "@powerhouse-ai/workflow",
    "@powerhouse-ai/sandbox",
  ],
};

export default nextConfig;
