import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
  poweredByHeader: false,
  productionBrowserSourceMaps: false,  // ← 30-50% weniger RAM
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
  },
};

export default nextConfig;
