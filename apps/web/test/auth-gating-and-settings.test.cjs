const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function testHeaderShowsLoginAndRegister() {
  const source = read("components/HeaderAuthActions.tsx");

  assert.match(source, /Login/);
  assert.match(source, /Register/);
  assert.doesNotMatch(source, /Google Sign In/);
}

function testAuthModalSupportsPasswordAndGoogle() {
  const source = read("components/AuthModal.tsx");
  const providerSource = read("components/AuthProvider.tsx");

  assert.match(source, /Create account/);
  assert.match(source, /Sign in/);
  assert.match(source, /Continue with Google/);
  assert.match(providerSource, /Registration successful\. Please sign in\./);
}

function testProtectedNavigationRequiresAuth() {
  const siteNavSource = read("components/SiteNav.tsx");
  const cardSource = read("components/ScenarioCard.tsx");

  assert.match(siteNavSource, /requiresAuth: true/);
  assert.match(siteNavSource, /requireAuth\(item\.href\)/);
  assert.match(cardSource, /requireAuth\(href\)/);
}

function testProtectedPagesOpenLoginFlow() {
  const practiceSource = read("features/conversation/PracticeExperience.tsx");
  const historySource = read("features/history/HistoryExperience.tsx");
  const reportSource = read("features/report/ReportExperience.tsx");
  const settingsSource = read("features/settings/SettingsExperience.tsx");

  assert.match(practiceSource, /getCurrentPath\("\/practice"\)/);
  assert.match(historySource, /getCurrentPath\("\/history"\)/);
  assert.match(reportSource, /getCurrentPath\(`\/reports\/\$\{conversationId\}`\)/);
  assert.match(settingsSource, /getCurrentPath\("\/settings"\)/);
}

function testSettingsUsesInlineLabelLayout() {
  const source = read("features/settings/SettingsExperience.tsx");

  assert.match(source, /md:grid-cols-\[12rem_1fr\]/);
}

try {
  testHeaderShowsLoginAndRegister();
  console.log("PASS header auth actions");

  testAuthModalSupportsPasswordAndGoogle();
  console.log("PASS auth modal modes");

  testProtectedNavigationRequiresAuth();
  console.log("PASS protected navigation gating");

  testProtectedPagesOpenLoginFlow();
  console.log("PASS protected page login flow");

  testSettingsUsesInlineLabelLayout();
  console.log("PASS settings inline field layout");
} catch (error) {
  console.error("FAIL web auth gating tests");
  console.error(error);
  process.exit(1);
}
