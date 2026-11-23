import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next's flat config already includes react, react-hooks and jsx-a11y rules.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }] } },
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts"]),
]);
