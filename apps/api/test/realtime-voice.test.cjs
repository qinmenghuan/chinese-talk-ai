const assert = require("node:assert/strict");

const {
  DoubaoPromptBuilder,
} = require("../dist/common/volcengine/doubao-prompt.builder.js");
const { RtcTokenService } = require("../dist/common/volcengine/rtc-token.service.js");
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
  assert.match(prompt, /Learner role:/);
  assert.match(prompt, new RegExp(scenario.title));
}

try {
  testScenarioLookup();
  console.log("PASS scenario lookup");

  testRtcTokenGeneration();
  console.log("PASS rtc token generation");

  testPromptBuilder();
  console.log("PASS prompt builder");
} catch (error) {
  console.error("FAIL realtime voice tests");
  console.error(error);
  process.exit(1);
}
