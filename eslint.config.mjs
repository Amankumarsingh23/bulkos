import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React Compiler lint rules flag valid patterns that the compiler can't
      // auto-optimize. They are performance hints, not correctness errors.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // `any` is occasionally required for third-party library boundaries
      // (e.g. Recharts tooltip props). Warn but don't block builds.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars as warnings (pre-existing across the codebase)
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);

export default eslintConfig;
