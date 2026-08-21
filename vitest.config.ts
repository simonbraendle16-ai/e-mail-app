import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // Siehe test/server-only-attrappe.ts
      "server-only": path.resolve(
        import.meta.dirname,
        "test/server-only-attrappe.ts",
      ),
    },
  },
});
