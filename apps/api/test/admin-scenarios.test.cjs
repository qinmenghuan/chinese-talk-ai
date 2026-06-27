const assert = require("node:assert/strict");
require("reflect-metadata");

const {
  PATH_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
} = require("@nestjs/common/constants");
const { RequestMethod } = require("@nestjs/common");
const {
  AdminScenarioController,
} = require("../dist/modules/scenario/admin-scenario.controller.js");
const {
  AdminConversationController,
} = require("../dist/modules/conversation/admin-conversation.controller.js");
const {
  ConversationModule,
} = require("../dist/modules/conversation/conversation.module.js");
const {
  ConversationService,
} = require("../dist/modules/conversation/conversation.service.js");
const { ScenarioModule } = require("../dist/modules/scenario/scenario.module.js");
const { ScenarioService } = require("../dist/modules/scenario/scenario.service.js");
const {
  defaultAdminScenarios,
} = require("../dist/modules/scenario/admin-scenario.data.js");

function testAdminScenarioControllerRoute() {
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, AdminScenarioController),
    "admin/scenarios"
  );

  const listHandler = AdminScenarioController.prototype.list;
  assert.equal(Reflect.getMetadata(PATH_METADATA, listHandler), "/");
  assert.equal(Reflect.getMetadata(METHOD_METADATA, listHandler), RequestMethod.GET);
}

function testScenarioModuleRegistersAdminController() {
  const controllers =
    Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ScenarioModule) ?? [];

  assert.ok(
    controllers.includes(AdminScenarioController),
    "ScenarioModule should register AdminScenarioController"
  );
}

function testDefaultAdminScenarioLanguageRules() {
  for (const scenario of defaultAdminScenarios) {
    assert.match(scenario.title, /^[A-Za-z0-9 ,'"()-]+$/);
    assert.match(scenario.openingLineChinese, /[\u4e00-\u9fff]/);
  }
}

function testAdminConversationControllerRoute() {
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, AdminConversationController),
    "admin/conversations"
  );

  const listHandler = AdminConversationController.prototype.list;
  assert.equal(Reflect.getMetadata(PATH_METADATA, listHandler), "/");
  assert.equal(Reflect.getMetadata(METHOD_METADATA, listHandler), RequestMethod.GET);
}

function testConversationModuleRegistersAdminController() {
  const controllers =
    Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ConversationModule) ?? [];

  assert.ok(
    controllers.includes(AdminConversationController),
    "ConversationModule should register AdminConversationController"
  );
}

async function testAdminConversationDeleteIsLogicalAndIdempotent() {
  const savedRecords = [];
  const record = {
    id: "conv_1",
    deletedAt: null,
    deletedByAdminId: null,
  };
  const conversationRepository = {
    async findOne({ where }) {
      if (where.id !== record.id) {
        return null;
      }

      return record;
    },
    async save(next) {
      savedRecords.push({ ...next });
      Object.assign(record, next);
      return next;
    },
  };
  const service = new ConversationService(conversationRepository, {}, {}, {}, {}, {});

  const result = await service.deleteConversationByAdmin("conv_1", "admin_1");
  assert.deepEqual(result, { success: true });
  assert.ok(record.deletedAt instanceof Date);
  assert.equal(record.deletedByAdminId, "admin_1");
  assert.equal(savedRecords.length, 1);

  const second = await service.deleteConversationByAdmin("conv_1", "admin_2");
  assert.deepEqual(second, { success: true });
  assert.equal(record.deletedByAdminId, "admin_1");
  assert.equal(savedRecords.length, 1);
}

async function testPublicScenarioListUsesDatabaseRows() {
  const calls = [];
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const updatedAt = new Date("2026-01-02T00:00:00.000Z");
  const scenarioRows = [
    {
      id: "db-cafe",
      type: "daily",
      title: "Database Cafe",
      subtitle: "Persisted cafe practice.",
      mode: "scenario",
      difficulty: "beginner",
      goal: "Order from persisted data.",
      coverUrl: "https://example.com/cafe.jpg",
      defaultRoleId: "db-cafe-learner",
      openingLine: "你好，想喝什么？",
      promptHint: "Use short beginner sentences.",
      isActive: true,
      createdAt,
      updatedAt,
      roles: [
        {
          id: "db-cafe-tutor",
          code: "tutor",
          name: "Tutor",
          description: "The AI guides the exchange.",
          isAiRole: true,
          sortOrder: 1,
          createdAt,
        },
        {
          id: "db-cafe-learner",
          code: "learner",
          name: "Learner",
          description: "The learner orders a drink.",
          isAiRole: false,
          sortOrder: 0,
          createdAt,
        },
      ],
    },
  ];
  const queryBuilder = {
    leftJoinAndSelect(...args) {
      calls.push(["leftJoinAndSelect", ...args]);
      return this;
    },
    where(...args) {
      calls.push(["where", ...args]);
      return this;
    },
    andWhere(...args) {
      calls.push(["andWhere", ...args]);
      return this;
    },
    orderBy(...args) {
      calls.push(["orderBy", ...args]);
      return this;
    },
    addOrderBy(...args) {
      calls.push(["addOrderBy", ...args]);
      return this;
    },
    skip(value) {
      calls.push(["skip", value]);
      return this;
    },
    take(value) {
      calls.push(["take", value]);
      return this;
    },
    async getManyAndCount() {
      calls.push(["getManyAndCount"]);
      return [scenarioRows, 1];
    },
  };
  const scenarioRepository = {
    createQueryBuilder(alias) {
      calls.push(["createQueryBuilder", alias]);
      return queryBuilder;
    },
  };
  const service = new ScenarioService(scenarioRepository);

  const result = await service.getScenarios({
    mode: "scenario",
    keyword: "Cafe",
    difficulty: "beginner",
    type: "daily",
    page: 2,
    pageSize: 5,
  });

  assert.equal(result.total, 1);
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 5);
  assert.equal(result.items[0].id, "db-cafe");
  assert.equal(result.items[0].cover, "https://example.com/cafe.jpg");
  assert.deepEqual(
    result.items[0].roles.map((role) => role.id),
    ["db-cafe-learner", "db-cafe-tutor"]
  );
  assert.deepEqual(result.items[0].openingLinesByRoleId, {
    "db-cafe-learner": "你好，想喝什么？",
  });
  assert.deepEqual(calls[0], ["createQueryBuilder", "scenario"]);
  assert.ok(
    calls.some(
      (call) =>
        call[0] === "leftJoinAndSelect" &&
        call[1] === "scenario.roles" &&
        call[2] === "role"
    )
  );
  assert.ok(
    calls.some(
      (call) =>
        call[0] === "andWhere" && String(call[1]).includes("LOWER(scenario.title)")
    )
  );
  assert.ok(calls.some((call) => call[0] === "skip" && call[1] === 5));
  assert.ok(calls.some((call) => call[0] === "take" && call[1] === 5));
}

Promise.resolve()
  .then(async () => {
    testAdminScenarioControllerRoute();
    console.log("PASS admin scenario controller route");

    testScenarioModuleRegistersAdminController();
    console.log("PASS scenario module controller registration");

    testAdminConversationControllerRoute();
    console.log("PASS admin conversation controller route");

    testConversationModuleRegistersAdminController();
    console.log("PASS conversation module controller registration");

    testDefaultAdminScenarioLanguageRules();
    console.log("PASS admin scenario language rules");

    await testAdminConversationDeleteIsLogicalAndIdempotent();
    console.log("PASS admin conversation logical delete");

    await testPublicScenarioListUsesDatabaseRows();
    console.log("PASS public scenario list database rows");
  })
  .catch((error) => {
    console.error("FAIL admin scenario tests");
    console.error(error);
    process.exit(1);
  });
