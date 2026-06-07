const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("admin main entry applies theme variables to the document root", () => {
  const source = read("src/main.tsx");

  assert.match(
    source,
    /import\s+\{\s*cssVariables\s*\}\s+from\s+"@learn-chinese-ai\/design-tokens"/
  );
  assert.match(source, /Object\.entries\(cssVariables\)/);
  assert.doesNotMatch(source, /admin-theme/);
});

test("admin styles include packages/ui as a tailwind source", () => {
  const source = read("src/styles.css");

  assert.match(source, /@source "\.\.\/\.\.\/\.\.\/packages\/ui\/src";/);
});

test("button component uses the shared design-token radius variable", () => {
  const source = read(
    path.join("..", "..", "packages", "ui", "src", "components", "button.tsx")
  );

  assert.match(source, /rounded-\[var\(--radius-button\)\]/);
  assert.match(source, /rounded-\[var\(--radius-pill\)\]/);
});
