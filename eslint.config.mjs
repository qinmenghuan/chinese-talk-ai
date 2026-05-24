import globals from "globals";
import nextConfig from "./packages/eslint-config/next.mjs";
import nodeConfig from "./packages/eslint-config/node.mjs";
import reactConfig from "./packages/eslint-config/react.mjs";

export default [
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
  ...nextConfig,
  ...reactConfig,
  ...nodeConfig,
];
