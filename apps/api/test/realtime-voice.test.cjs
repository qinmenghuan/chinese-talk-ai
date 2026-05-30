const assert = require("node:assert/strict");

const {
  DoubaoPromptBuilder,
} = require("../dist/common/volcengine/doubao-prompt.builder.js");
const {
  resolveScenarioOpeningLine,
} = require("../dist/common/scenario/resolve-scenario-opening-line.js");
const { RtcTokenService } = require("../dist/common/volcengine/rtc-token.service.js");
const {
  buildConversationSummary,
  buildHistoryListResponse,
} = require("../dist/modules/history/history-summary.js");
const { ScenarioService } = require("../dist/modules/scenario/scenario.service.js");

function testScenarioLookup() {
  const scenarioService = new ScenarioService();
  const scenario = scenarioService.getScenarioById("daily-cafe", "scenario");
  const role = scenarioService.getScenarioRole(scenario, "daily-cafe-customer");

  assert.equal(scenario.id, "daily-cafe");
  assert.equal(role.id, "daily-cafe-customer");
}

function testRtcTokenGeneration() {
  const tokenService = new RtcTokenService({
    rtcAppId: "123456789012345678901234",
    rtcAppKey: "secret-key",
    tokenExpireSeconds: 3600,
  });
  const token = tokenService.createJoinToken({
    roomId: "practice_room",
    userId: "visitor_123",
  });

  assert.equal(typeof token, "string");
  assert.ok(token.length > 20);
  assert.equal(tokenService.getExpiresInSeconds(), 3600);
}

function testPromptBuilder() {
  const scenarioService = new ScenarioService();
  const promptBuilder = new DoubaoPromptBuilder();
  const scenario = scenarioService.getScenarioById("interview-intro", "scenario");
  const role = scenarioService.getScenarioRole(scenario, "interview-intro-candidate");
  const prompt = promptBuilder.build({
    scenario,
    selectedRole: role,
  });

  assert.match(prompt, /Scenario:/);
  assert.match(prompt, /Difficulty:/);
  assert.match(prompt, /Learner role:/);
  assert.match(prompt, new RegExp(scenario.title));
  assert.match(
    prompt,
    new RegExp(
      resolveScenarioOpeningLine(scenario, role.id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
  );
}

function testRoleSpecificOpeningLine() {
  const scenarioService = new ScenarioService();
  const scenario = scenarioService.getScenarioById("daily-cafe", "scenario");
  const customerOpening = resolveScenarioOpeningLine(scenario, "daily-cafe-customer");
  const baristaOpening = resolveScenarioOpeningLine(scenario, "daily-cafe-barista");

  assert.equal(customerOpening, "欢迎光临，请问你今天想喝点什么？");
  assert.equal(baristaOpening, "你好，我想点一杯拿铁，可以做成燕麦奶吗？");
  assert.notEqual(customerOpening, baristaOpening);
}

function testDifficultyGuidanceInPrompt() {
  const scenarioService = new ScenarioService();
  const promptBuilder = new DoubaoPromptBuilder();
  const beginnerScenario = scenarioService.getScenarioById("travel-hotel", "scenario");
  const beginnerRole = scenarioService.getScenarioRole(
    beginnerScenario,
    "travel-hotel-guest"
  );
  const advancedScenario = scenarioService.getScenarioById(
    "business-meeting",
    "scenario"
  );
  const advancedRole = scenarioService.getScenarioRole(
    advancedScenario,
    "business-meeting-host"
  );

  const beginnerPrompt = promptBuilder.build({
    scenario: beginnerScenario,
    selectedRole: beginnerRole,
  });
  const advancedPrompt = promptBuilder.build({
    scenario: advancedScenario,
    selectedRole: advancedRole,
  });

  assert.match(beginnerPrompt, /Difficulty: beginner/);
  assert.match(beginnerPrompt, /very common Mandarin words and short sentences/);
  assert.match(beginnerPrompt, /Ask only one concrete question at a time/);
  assert.match(beginnerPrompt, /Do not use native-speaker style pressure phrases/);
  assert.match(beginnerPrompt, /我帮您再看一下/);
  assert.match(beginnerPrompt, /请问是哪一天/);

  assert.match(advancedPrompt, /Difficulty: advanced/);
  assert.match(advancedPrompt, /professional or scenario-specific wording/);
  assert.match(advancedPrompt, /do not oversimplify the language/);
}

function testHistorySummaryPresentation() {
  const scenarioService = new ScenarioService();
  const scenario = scenarioService.getScenarioById("daily-cafe", "scenario");
  const role = scenarioService.getScenarioRole(scenario, "daily-cafe-barista");
  const startedAt = new Date("2026-05-30T08:30:45.000Z");
  const endedAt = new Date("2026-05-30T08:42:10.000Z");

  const scoredSummary = buildConversationSummary({
    id: "conv_scored",
    scenario,
    startedAt,
    endedAt,
    status: "report_ready",
    selectedRole: role,
    selectedDifficulty: "advanced",
    report: {
      grammarScore: 80,
      vocabularyScore: 82,
      fluencyScore: 84,
      pronunciationScore: 86,
      toneScore: 88,
      naturalnessScore: 90,
    },
  });

  assert.equal(scoredSummary.roleName, role.name);
  assert.equal(scoredSummary.difficulty, "advanced");
  assert.equal(scoredSummary.reportState, "score");
  assert.equal(scoredSummary.score, 85);
  assert.equal(scoredSummary.startedAt, startedAt.toISOString());
  assert.equal(scoredSummary.endedAt, endedAt.toISOString());

  const noReportSummary = buildConversationSummary({
    id: "conv_no_report",
    scenario,
    startedAt,
    status: "ended",
    selectedRole: role,
  });

  assert.equal(noReportSummary.reportState, "no_report");
  assert.equal(noReportSummary.score, 0);
  assert.equal(noReportSummary.difficulty, scenario.difficulty);

  const pendingSummary = buildConversationSummary({
    id: "conv_pending",
    scenario,
    startedAt,
    status: "report_pending",
    selectedRole: role,
  });

  assert.equal(pendingSummary.reportState, "pending");
  assert.equal(pendingSummary.score, 0);

  const pagedResponse = buildHistoryListResponse({
    items: [scoredSummary, noReportSummary],
    page: 1,
    pageSize: 2,
    total: 5,
  });

  assert.equal(pagedResponse.items.length, 2);
  assert.equal(pagedResponse.page, 1);
  assert.equal(pagedResponse.pageSize, 2);
  assert.equal(pagedResponse.total, 5);
  assert.equal(pagedResponse.hasMore, true);

  const finalPageResponse = buildHistoryListResponse({
    items: [pendingSummary],
    page: 3,
    pageSize: 2,
    total: 5,
  });

  assert.equal(finalPageResponse.hasMore, false);
}

try {
  testScenarioLookup();
  console.log("PASS scenario lookup");

  testRtcTokenGeneration();
  console.log("PASS rtc token generation");

  testPromptBuilder();
  console.log("PASS prompt builder");

  testRoleSpecificOpeningLine();
  console.log("PASS role specific opening line");

  testDifficultyGuidanceInPrompt();
  console.log("PASS difficulty guidance in prompt");

  testHistorySummaryPresentation();
  console.log("PASS history summary presentation");
} catch (error) {
  console.error("FAIL realtime voice tests");
  console.error(error);
  process.exit(1);
}
