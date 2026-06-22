const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("reflect-metadata");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

async function testConversationCreateDoesNotWriteAnonymousFields() {
  const {
    ConversationService,
  } = require("../dist/modules/conversation/conversation.service.js");

  let savedConversation = null;
  const conversationRepository = {
    async save(next) {
      savedConversation = { ...next };
      return next;
    },
  };
  const scenario = {
    id: "daily-cafe",
    mode: "roleplay",
    roles: [{ id: "customer", name: "Customer" }],
  };
  const scenarioService = {
    getScenarioById() {
      return scenario;
    },
    getScenarioRole() {
      return scenario.roles[0];
    },
  };
  const service = new ConversationService(
    conversationRepository,
    {},
    {},
    {},
    scenarioService,
    {}
  );

  const result = await service.create("user_1", {
    scenarioId: "daily-cafe",
    roleId: "customer",
    mode: "roleplay",
  });

  assert.equal(result.scenarioId, "daily-cafe");
  assert.equal(savedConversation.userId, "user_1");
  assert.equal(
    Object.hasOwn(savedConversation, "anonymousSessionId"),
    false,
    "New conversations should rely on userId and omit anonymousSessionId."
  );
}

async function testRealtimeCreateDoesNotWriteAnonymousFields() {
  const { RealtimeService } = require("../dist/modules/realtime/realtime.service.js");

  let savedConversation = null;
  let cachedTranscript = null;
  const scenario = {
    id: "daily-cafe",
    type: "daily",
    title: "Daily Cafe",
    subtitle: "Order coffee",
    mode: "scenario",
    difficulty: "beginner",
    goal: "Order a drink",
    coverUrl: "/cover.jpg",
    defaultRoleId: "customer",
    openingLine: "你好，想喝点什么？",
    openingLinesByRoleId: {
      customer: "你好，想喝点什么？",
    },
    promptHint: "Practice ordering.",
    roles: [{ id: "customer", name: "Customer" }],
  };
  const conversationRepository = {
    async save(next) {
      savedConversation = { ...next };
      return next;
    },
  };
  const userPreferenceRepository = {
    async findOne() {
      return { preferredVoiceId: "friendly-female" };
    },
  };
  const redisService = {
    async setJson(_key, value) {
      cachedTranscript = value;
    },
  };
  const scenarioService = {
    getScenarioById() {
      return scenario;
    },
    getScenarioRole() {
      return scenario.roles[0];
    },
  };
  const service = new RealtimeService(
    conversationRepository,
    userPreferenceRepository,
    redisService,
    scenarioService,
    {
      realtimeModel: "test-model",
      realtimeVoice: "fallback-voice",
      realtimeInputSampleRate: 16000,
      realtimeOutputSampleRate: 24000,
      realtimeVadSilenceMs: 600,
    }
  );

  const result = await service.createSession("user_1", {
    scenarioId: "daily-cafe",
    roleId: "customer",
    mode: "scenario",
  });

  assert.equal(result.conversationStatus, "active");
  assert.equal(savedConversation.userId, "user_1");
  assert.equal(
    Object.hasOwn(savedConversation, "anonymousSessionId"),
    false,
    "Realtime conversations should rely on userId and omit anonymousSessionId."
  );
  assert.equal(cachedTranscript.length, 1);
}

async function testConversationClosePersistsTranscriptAndGeneratesReport() {
  const {
    ConversationService,
  } = require("../dist/modules/conversation/conversation.service.js");

  const conversation = {
    id: "conv_1",
    userId: "user_1",
    scenarioId: "daily-cafe",
    status: "active",
    startedAt: new Date("2026-06-11T00:00:00.000Z"),
    endedAt: null,
    durationSeconds: 0,
  };
  let savedConversation = null;
  let savedMessages = null;
  let reportConversationId = null;
  const conversationRepository = {
    async findOne() {
      return conversation;
    },
    async save(next) {
      savedConversation = { ...next };
      Object.assign(conversation, next);
      return next;
    },
  };
  const messageRepository = {
    async delete() {},
    async save(next) {
      savedMessages = next;
      return next;
    },
  };
  const redisService = {
    async getJson() {
      return [
        {
          id: "msg_1",
          role: "user",
          content: "我要一杯咖啡",
          contentType: "final",
          createdAt: "2026-06-11T00:00:01.000Z",
        },
      ];
    },
    async setIfAbsent() {
      return true;
    },
    async delete() {},
  };
  const reportService = {
    async generateAndStoreReport(conversationId) {
      reportConversationId = conversationId;
    },
  };
  const service = new ConversationService(
    conversationRepository,
    messageRepository,
    {},
    redisService,
    {},
    reportService
  );

  const result = await service.close("user_1", "conv_1", {});

  assert.equal(result.status, "report_ready");
  assert.equal(result.reportStatus, "ready");
  assert.equal(savedConversation.status, "report_pending");
  assert.equal(savedMessages.length, 1);
  assert.equal(savedMessages[0].conversationId, "conv_1");
  assert.equal(reportConversationId, "conv_1");
}

function testAdminSummariesUseUserOnlyFallback() {
  const {
    resolveAdminConversationUserDisplay,
  } = require("../dist/modules/conversation/admin-conversation-summary.js");
  const {
    buildAdminReportListItem,
  } = require("../dist/modules/report/admin-report-summary.js");

  assert.equal(
    resolveAdminConversationUserDisplay({
      user: {
        id: "user_1",
        email: "learner@example.com",
        displayName: "Learner",
      },
    }),
    "Learner · learner@example.com"
  );
  assert.equal(resolveAdminConversationUserDisplay({ user: null }), "Legacy Anonymous");

  const reportItem = buildAdminReportListItem({
    id: "rep_1",
    conversationId: "conv_1",
    title: "Report",
    status: "ready",
    generatedAt: "2026-06-11T00:00:00.000Z",
    scenario: {
      title: "Daily Cafe",
      type: "daily",
      difficulty: "beginner",
    },
    selectedRole: {
      name: "Customer",
    },
    user: null,
    scores: {
      grammarScore: 80,
      vocabularyScore: 80,
      fluencyScore: 80,
      pronunciationScore: 80,
      toneScore: 80,
      naturalnessScore: 80,
    },
  });

  assert.equal(reportItem.userDisplay, "Legacy Anonymous");
}

function testRuntimeCodeNoLongerReadsAnonymousSession() {
  const conversationService = read("src/modules/conversation/conversation.service.ts");
  const reportService = read("src/modules/report/report.service.ts");
  const realtimeService = read("src/modules/realtime/realtime.service.ts");
  const entities = read("src/common/database/entities.ts");

  assert.doesNotMatch(conversationService, /conversation\.anonymousSession/);
  assert.doesNotMatch(conversationService, /visitorTokenHash/);
  assert.doesNotMatch(reportService, /conversation\.anonymousSession/);
  assert.doesNotMatch(reportService, /visitorTokenHash/);
  assert.doesNotMatch(realtimeService, /anonymousSessionId/);
  assert.doesNotMatch(entities, /AnonymousSessionEntity/);
  assert.doesNotMatch(entities, /anonymous_session/);
  assert.doesNotMatch(entities, /anonymousSessionId/);
  assert.equal(
    fs.existsSync(
      path.resolve(__dirname, "../src/common/runtime/practice-store.service.ts")
    ),
    false
  );
  assert.equal(
    fs.existsSync(path.resolve(__dirname, "../src/common/runtime/runtime.module.ts")),
    false
  );
}

Promise.resolve()
  .then(async () => {
    await testConversationCreateDoesNotWriteAnonymousFields();
    console.log("PASS conversation creation omits anonymous fields");

    await testRealtimeCreateDoesNotWriteAnonymousFields();
    console.log("PASS realtime creation omits anonymous fields");

    await testConversationClosePersistsTranscriptAndGeneratesReport();
    console.log("PASS conversation close persists transcript and generates report");

    testAdminSummariesUseUserOnlyFallback();
    console.log("PASS admin summaries use user-only fallback");

    testRuntimeCodeNoLongerReadsAnonymousSession();
    console.log("PASS runtime code no longer reads anonymous sessions");
  })
  .catch((error) => {
    console.error("FAIL anonymous retirement tests");
    console.error(error);
    process.exit(1);
  });
