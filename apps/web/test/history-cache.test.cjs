const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function testHistoryCacheIsScopedByCurrentUser() {
  const source = read("features/history/HistoryExperience.tsx");

  assert.match(source, /const \{ status, session, requireAuth \} = useAuth\(\)/);
  assert.match(source, /const userId = session\?\.user\.id/);
  assert.match(source, /function getHistoryCacheKey\(currentUserId: string\)/);
  assert.match(source, /`\$\{HISTORY_CACHE_KEY\}:\$\{currentUserId\}`/);
  assert.match(source, /writeHistoryCache\(userId,/);
}

function testHistoryStillRefreshesWhenCacheExists() {
  const source = read("features/history/HistoryExperience.tsx");
  const cacheBranchIndex = source.indexOf("if (cached) {");
  const loadFirstPageIndex = source.indexOf("const response = await loadHistoryPage(1);");
  const loadFunctionEndIndex = source.indexOf("initialLoadHandledRef.current = true;");
  const cacheBranch = source.slice(cacheBranchIndex, loadFirstPageIndex);

  assert.notEqual(cacheBranchIndex, -1);
  assert.notEqual(loadFirstPageIndex, -1);
  assert.ok(
    loadFirstPageIndex < loadFunctionEndIndex,
    "History page should still fetch the first server page during initial load."
  );
  assert.doesNotMatch(
    cacheBranch,
    /return;/,
    "A cached history page must not stop the fresh /history request."
  );
}

try {
  testHistoryCacheIsScopedByCurrentUser();
  console.log("PASS history cache is scoped by current user");

  testHistoryStillRefreshesWhenCacheExists();
  console.log("PASS history cache does not block refresh");
} catch (error) {
  console.error("FAIL history cache tests");
  console.error(error);
  process.exit(1);
}
