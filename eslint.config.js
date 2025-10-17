import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
      "no-magic-numbers": [
        "warn",
        { ignore: [-1, 0, 1, 2, 100], ignoreArrayIndexes: true, enforceConst: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // mulberry32 and FNV-1a are published algorithms; naming their round
    // constants would obscure them rather than explain them.
    files: ["src/lib/rng.ts"],
    rules: { "no-magic-numbers": "off" },
  },
  {
    files: ["**/*.test.{ts,tsx}", "vitest.setup.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "no-magic-numbers": "off" },
  },
  {
    files: ["*.config.{js,ts}", "vitest.setup.ts"],
    rules: { "react-refresh/only-export-components": "off" },
  },
]);
