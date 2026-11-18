import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

import { resolveTestDatabaseUrl } from "./src/test/database-url";

const testDatabaseUrl = resolveTestDatabaseUrl();

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DIRECT_URL = testDatabaseUrl;
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: testDatabaseUrl
      ? { DATABASE_URL: testDatabaseUrl, DIRECT_URL: testDatabaseUrl }
      : {},
    globalSetup: testDatabaseUrl ? ["./src/test/global-setup.ts"] : [],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The real package throws outside the RSC bundler.
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
});
