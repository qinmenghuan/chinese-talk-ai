module.exports = {
  root: false,
  env: {
    es2022: true,
    browser: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error"
  }
};
