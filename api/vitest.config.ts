import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: "dotenv/config",
    coverage: {
      exclude: ["src/prisma/**"],
    },
  },
});
