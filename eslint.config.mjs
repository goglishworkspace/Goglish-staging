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
  {
    rules: {
      // Honor the conventional "_" prefix for deliberately-unused bindings.
      // The pattern this codebase actually uses it for is omit-a-key
      // destructuring (`const { exams: _exams, ...rest } = row`) to strip a
      // joined relation out of an API response - the binding is never meant
      // to be read, and naming it is the only way to drop the key.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
