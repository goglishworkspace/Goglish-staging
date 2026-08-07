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
    // Supabase CLI's own generated bundles (gitignored, but ESLint doesn't
    // read .gitignore) - `supabase start` writes a minified edge-runtime
    // script here that isn't our source.
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
