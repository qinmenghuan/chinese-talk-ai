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

try {
  testAdminScenarioControllerRoute();
  console.log("PASS admin scenario controller route");

  testScenarioModuleRegistersAdminController();
  console.log("PASS scenario module controller registration");
} catch (error) {
  console.error("FAIL admin scenario tests");
  console.error(error);
  process.exit(1);
}
