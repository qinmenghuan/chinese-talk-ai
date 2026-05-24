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
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];

export default nextConfig;
