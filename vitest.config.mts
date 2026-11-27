import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text-summary", "text"],
      // CI fails if coverage drops below these floors (set a little under the current figures).
      thresholds: { statements: 95, branches: 87, functions: 95, lines: 97 },
    },
  },
});
