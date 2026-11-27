import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next's flat config already includes react, react-hooks and jsx-a11y rules.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      eqeqeq: ["error", "smart"],
      "no-nested-ternary": "error",
      "no-console": "error",
      // Keep functions small and flat enough to read in one go.
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 4],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
    },
  },
  // The logger is the one place allowed to write to the console.
  { files: ["src/lib/log.ts"], rules: { "no-console": "off" } },
  // Test suites are long describe() blocks by nature.
  { files: ["tests/**"], rules: { "max-lines-per-function": "off" } },
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts"]),
]);
