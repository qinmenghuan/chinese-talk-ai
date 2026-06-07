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

try {
  testAdminScenarioControllerRoute();
  console.log("PASS admin scenario controller route");

  testScenarioModuleRegistersAdminController();
  console.log("PASS scenario module controller registration");

  testDefaultAdminScenarioLanguageRules();
  console.log("PASS admin scenario language rules");
} catch (error) {
  console.error("FAIL admin scenario tests");
  console.error(error);
  process.exit(1);
}
