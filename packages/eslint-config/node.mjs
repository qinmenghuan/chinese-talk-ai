import globals from "globals";
import { createTypeScriptConfig } from "./base.mjs";

const nodeConfig = createTypeScriptConfig({
  files: [
    "apps/api/**/*.ts",
    "packages/{design-tokens,shared-types,shared-zod}/src/**/*.ts",
  ],
  globals: {
    ...globals.node,
  },
});

export default nodeConfig;
