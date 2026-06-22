const assert = require("node:assert/strict");
require("reflect-metadata");

const { ReportService } = require("../dist/modules/report/report.service.js");

function createConversationFixture() {
  return {
    id: "conv_without_report",
    userId: "user_1",
    scenarioId: "daily-cafe",
    scenario: {
      id: "daily-cafe",
      type: "daily",
      title: "Cafe Ordering",
      difficulty: "beginner",
      goal: "Order coffee in Chinese.",
    },
    selectedRole: {
      name: "Customer",
    },
    selectedDifficulty: "beginner",
    status: "ended",
    startedAt: new Date("2026-06-15T01:00:00.000Z"),
    endedAt: new Date("2026-06-15T01:03:00.000Z"),
    durationSeconds: 180,
    deletedAt: null,
  };
}

async function testReportDetailFallsBackWhenReportIsMissing() {
  const conversation = createConversationFixture();
  const conversationRepository = {
    async findOne({ where }) {
      if (where.id !== conversation.id || where.userId !== "user_1") {
        return null;
      }

      return conversation;
    },
  };
  const messageRepository = {
    async find() {
      return [
        {
          id: "msg_1",
          role: "user",
          content: "我要咖啡。",
          contentType: "final",
          createdAt: new Date("2026-06-15T01:00:10.000Z"),
        },
      ];
    },
  };
  const reportRepository = {
    async findOne() {
      return null;
    },
  };
  const service = new ReportService(
    conversationRepository,
    messageRepository,
    reportRepository
  );

  const detail = await service.getDetailByConversationIdForUser(
    "user_1",
    conversation.id
  );

  assert.equal(detail.conversation.id, conversation.id);
  assert.equal(detail.conversation.title, "Cafe Ordering");
  assert.equal(detail.conversation.reportState, "no_report");
  assert.equal(detail.conversation.durationSeconds, 180);
  assert.equal(detail.transcript.length, 1);
  assert.equal(detail.report, null);
}

async function testReportSummaryStillRequiresReport() {
  const conversation = createConversationFixture();
  const conversationRepository = {
    async findOne({ where }) {
      if (where.id !== conversation.id || where.userId !== "user_1") {
        return null;
      }

      return conversation;
    },
  };
  const reportRepository = {
    async findOne() {
      return null;
    },
  };
  const service = new ReportService(conversationRepository, {}, reportRepository);

  await assert.rejects(
    () => service.getByConversationIdForUser("user_1", conversation.id),
    /Report for conversation conv_without_report was not found\./
  );
}

Promise.resolve()
  .then(async () => {
    await testReportDetailFallsBackWhenReportIsMissing();
    console.log("PASS report detail falls back when report is missing");

    await testReportSummaryStillRequiresReport();
    console.log("PASS report summary still requires report");
  })
  .catch((error) => {
    console.error("FAIL report detail tests");
    console.error(error);
    process.exit(1);
  });
