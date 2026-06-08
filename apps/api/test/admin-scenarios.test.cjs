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
  })
  .catch((error) => {
    console.error("FAIL admin scenario tests");
    console.error(error);
    process.exit(1);
  });
