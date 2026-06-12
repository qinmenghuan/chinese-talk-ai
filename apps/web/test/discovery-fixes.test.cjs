const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function loadTsModule(relativePath) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const nextModule = new Module(filename, module);
  nextModule.filename = filename;
  nextModule.paths = Module._nodeModulePaths(path.dirname(filename));
  nextModule._compile(transpiled.outputText, filename);
  return nextModule.exports;
}

function testDiscoveryCacheSerialization() {
  const { parseDiscoveryCache, serializeDiscoveryCache, defaultFilters } = loadTsModule(
    "features/discovery/discovery-cache.ts"
  );

  const cache = {
    draftFilters: {
      ...defaultFilters,
      keyword: "hotel",
      difficulty: "beginner",
    },
    appliedFilters: {
      ...defaultFilters,
      type: "travel",
    },
    items: [{ id: "travel-hotel", title: "Hotel Check-in" }],
    page: 2,
    hasMore: true,
    scrollY: 480,
  };

  const serialized = serializeDiscoveryCache(cache);
  const parsed = parseDiscoveryCache(serialized);

  assert.deepEqual(parsed, cache);
  assert.equal(parseDiscoveryCache("{bad json"), null);
  assert.equal(parseDiscoveryCache(null), null);
}

function testNavActiveState() {
  const { isNavItemActive } = loadTsModule("components/site-nav.utils.ts");

  assert.equal(isNavItemActive("/", "/"), true);
  assert.equal(isNavItemActive("/discovery", "/discovery"), true);
  assert.equal(isNavItemActive("/discovery/topics", "/discovery"), true);
  assert.equal(isNavItemActive("/reports/123", "/history"), false);
  assert.equal(isNavItemActive("/practice", "/practice"), true);
  assert.equal(isNavItemActive("/practice/session", "/practice"), true);
  assert.equal(isNavItemActive("/history", "/history"), true);
  assert.equal(isNavItemActive("/history/session", "/history"), true);
}

function testPracticeHrefBuilder() {
  const { buildPracticeHref } = loadTsModule("lib/practice-navigation.ts");

  assert.equal(
    buildPracticeHref({
      scenarioId: "daily-cafe",
      roleId: "daily-cafe-customer",
      mode: "scenario",
      returnTo: "/discovery",
    }),
    "/practice?scenarioId=daily-cafe&roleId=daily-cafe-customer&mode=scenario&returnTo=%2Fdiscovery"
  );
  assert.equal(buildPracticeHref({}), "/practice");
}

try {
  testDiscoveryCacheSerialization();
  testNavActiveState();
  testPracticeHrefBuilder();
  console.log("PASS discovery bugfix helpers");
} catch (error) {
  console.error("FAIL discovery bugfix helpers");
  console.error(error);
  process.exit(1);
}
