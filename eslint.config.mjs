import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
  // TypeScript-specific rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // No unused variables (use TypeScript version)
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // No console.log - only console.error and console.warn allowed for frontend
      "no-console": [
        "error",
        {
          allow: ["error", "warn"],
        },
      ],

      // Additional strict rules
      "no-debugger": "error",
      "no-alert": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },
  // Server-side files can use more console methods
  {
    files: ["server/**/*.ts", "prisma/**/*.ts"],
    rules: {
      "no-console": "off", // Allow console in server files
    },
  },
]);

export default eslintConfig;
