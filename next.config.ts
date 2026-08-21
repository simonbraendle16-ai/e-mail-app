import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ohne das sucht Next.js sich die Wurzel selbst und landet im Benutzerordner,
  // weil dort ebenfalls eine package-lock.json liegt.
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
  // Keine Verbindung aus ihrem Browser zu fremden Servern (CLAUDE.md §4).
  // Schriften werden von next/font zur Bauzeit heruntergeladen und selbst ausgeliefert.
  poweredByHeader: false,
};

export default nextConfig;
