import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Imported backend/reference projects are intentionally quarantined from
    // the active application toolchain. Some contain their own generated output.
    "local-reference-archive/**",
    "news_papershapers/**",
    "newspaper2/**",
    "papershapers/**",
    "examples/**",
    "data/**",
    "backend/**",
    ".wrangler/**",
    "dist/**",
  ]),
]);

export default eslintConfig;
