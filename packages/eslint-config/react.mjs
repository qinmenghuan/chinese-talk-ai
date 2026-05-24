import globals from "globals";
import { createTypeScriptConfig } from "./base.mjs";

const reactConfig = createTypeScriptConfig({
  files: ["apps/admin/src/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
  globals: {
    ...globals.browser,
  },
  extraRules: {
    "no-alert": "error",
  },
});

export default reactConfig;
