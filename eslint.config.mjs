import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const __dirname = dirname(fileURLToPath(import.meta.url))

const compat = new FlatCompat({ baseDirectory: __dirname })

export default [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // The audio and Supabase paths legitimately carry values this codebase does not model
      // yet. Surfaced as warnings so they show up in review without gating the build; the
      // count should only go down.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // console is routed through lib/log.ts, which is the one place allowed to call it.
      "no-console": "warn",
    },
  },
  {
    files: ["lib/log.ts"],
    rules: { "no-console": "off" },
  },
]
