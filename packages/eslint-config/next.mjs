import globals from "globals";
import nextPlugin from "@next/eslint-plugin-next";
import { createTypeScriptConfig } from "./base.mjs";

const nextConfig = [
  ...createTypeScriptConfig({
    files: ["apps/web/**/*.{ts,tsx}"],
    globals: {
      ...globals.browser,
    },
  }),
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    settings: {
      next: {
        rootDir: ["apps/web"],
      },
    },
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default nextConfig;
