const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
  poweredByHeader: false,
  swcMinify: true,  // ← Schneller als Terser
  productionBrowserSourceMaps: false,  // ← 30-50% weniger RAM
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    maxSize: 50,  // ← Weniger Seiten im RAM halten
  },
};
