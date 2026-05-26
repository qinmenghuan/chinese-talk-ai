const assert = require("node:assert/strict");

const {
  PracticeStoreService,
} = require("../dist/common/runtime/practice-store.service.js");
const {
  ConversationService,
} = require("../dist/modules/conversation/conversation.service.js");
const { HistoryService } = require("../dist/modules/history/history.service.js");
const { RealtimeService } = require("../dist/modules/realtime/realtime.service.js");
const { ReportService } = require("../dist/modules/report/report.service.js");
const { ScenarioService } = require("../dist/modules/scenario/scenario.service.js");

function createServices() {
  const practiceStoreService = new PracticeStoreService();
  const scenarioService = new ScenarioService();
  const reportService = new ReportService(practiceStoreService);
  const conversationService = new ConversationService(
    practiceStoreService,
    scenarioService,
    reportService
  );
  const realtimeService = new RealtimeService(practiceStoreService, scenarioService);
  const historyService = new HistoryService(practiceStoreService);

  return {
    conversationService,
    historyService,
    realtimeService,
    reportService,
  };
}

function testRealtimeSessionCreation() {
  const { realtimeService } = createServices();
  const session = realtimeService.createSession({
    scenarioId: "daily-cafe",
    mode: "scenario",
    roleId: "daily-cafe-customer",
    visitorToken: "visitor-test-1",
  });

  assert.equal(session.provider, "doubao");
  assert.equal(session.scenario.id, "daily-cafe");
  assert.equal(session.selectedRole.id, "daily-cafe-customer");
  assert.equal(session.initialTranscript.length, 1);
  assert.equal(session.initialTranscript[0].role, "assistant");
  assert.match(session.initialTranscript[0].content, /欢迎光临/);
}

function testConversationCloseFlow() {
  const { conversationService, historyService, reportService } = createServices();

  const created = conversationService.create({
    anonymousSessionId: "anon_test",
    visitorToken: "visitor-test-2",
    scenarioId: "interview-intro",
    roleId: "interview-intro-candidate",
    mode: "scenario",
  });

  const firstReply = conversationService.reply(created.id, {
    content: "你好，我来自法国，我学习中文已经两年了。",
  });
  const secondReply = conversationService.reply(created.id, {
    content: "谢谢，我想提高口语，也想以后在中国工作。",
  });

  const closed = conversationService.close(created.id, {
    transcript: [
      firstReply.userMessage,
      firstReply.assistantMessage,
      secondReply.userMessage,
      secondReply.assistantMessage,
    ],
  });

  assert.equal(closed.status, "report_ready");
  assert.equal(closed.reportStatus, "ready");

  const history = historyService.list("visitor-test-2");
  assert.equal(history.length, 1);
  assert.equal(history[0].id, created.id);
  assert.equal(history[0].roleName, "候选人");

  const report = reportService.getByConversationId(created.id);
  assert.equal(report.conversationId, created.id);
  assert.match(report.title, /练习报告/);
  assert.equal(report.status, "ready");
  assert.ok(report.grammarScore >= 60);
  assert.ok(report.strengths.length > 0);
  assert.ok(report.issues.length > 0);
  assert.ok(report.suggestions.length > 0);
}

try {
  testRealtimeSessionCreation();
  console.log("PASS realtime session creation");

  testConversationCloseFlow();
  console.log("PASS conversation close flow");
} catch (error) {
  console.error("FAIL realtime voice tests");
  console.error(error);
  process.exit(1);
}
