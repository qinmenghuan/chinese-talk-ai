import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";

export const baseIgnores = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/coverage/**",
  "**/.turbo/**",
  "**/.logs/**",
  "**/*.d.ts",
];

export function createTypeScriptConfig({ files, globals = {}, extraRules = {} }) {
  return [
    {
      ignores: baseIgnores,
    },
    js.configs.recommended,
    {
      files,
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
        },
        globals,
      },
      plugins: {
        "@typescript-eslint": tsPlugin,
      },
      rules: {
        ...tsPlugin.configs.recommended.rules,
        "no-unused-vars": "off",
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            prefer: "type-imports",
            disallowTypeAnnotations: false,
          },
        ],
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
        "no-undef": "off",
        "no-console": "warn",
        ...extraRules,
      },
    },
    eslintConfigPrettier,
  ];
}
