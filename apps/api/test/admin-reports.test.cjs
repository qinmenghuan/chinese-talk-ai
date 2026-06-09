const assert = require("node:assert/strict");
require("reflect-metadata");

const {
  PATH_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
} = require("@nestjs/common/constants");
const { RequestMethod } = require("@nestjs/common");
const {
  AdminReportController,
} = require("../dist/modules/report/admin-report.controller.js");
const { ReportModule } = require("../dist/modules/report/report.module.js");
const { ReportService } = require("../dist/modules/report/report.service.js");

function testAdminReportControllerRoutes() {
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, AdminReportController),
    "admin/reports"
  );

  const listHandler = AdminReportController.prototype.list;
  assert.equal(Reflect.getMetadata(PATH_METADATA, listHandler), "/");
  assert.equal(Reflect.getMetadata(METHOD_METADATA, listHandler), RequestMethod.GET);

  const detailHandler = AdminReportController.prototype.getDetail;
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, detailHandler),
    ":conversationId/detail"
  );
  assert.equal(Reflect.getMetadata(METHOD_METADATA, detailHandler), RequestMethod.GET);

  const removeHandler = AdminReportController.prototype.remove;
  assert.equal(Reflect.getMetadata(PATH_METADATA, removeHandler), ":id");
  assert.equal(Reflect.getMetadata(METHOD_METADATA, removeHandler), RequestMethod.DELETE);
}

function testReportModuleRegistersAdminController() {
  const controllers =
    Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ReportModule) ?? [];

  assert.ok(
    controllers.includes(AdminReportController),
    "ReportModule should register AdminReportController"
  );
}

async function testAdminReportDeleteIsLogicalAndIdempotent() {
  const savedRecords = [];
  const record = {
    id: "rep_1",
    deletedAt: null,
    deletedByAdminId: null,
    conversation: {
      deletedAt: null,
    },
  };
  const reportRepository = {
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
  const service = new ReportService({}, {}, reportRepository);

  const result = await service.deleteReportByAdmin("rep_1", "admin_1");
  assert.deepEqual(result, { success: true });
  assert.ok(record.deletedAt instanceof Date);
  assert.equal(record.deletedByAdminId, "admin_1");
  assert.equal(savedRecords.length, 1);

  const second = await service.deleteReportByAdmin("rep_1", "admin_2");
  assert.deepEqual(second, { success: true });
  assert.equal(record.deletedByAdminId, "admin_1");
  assert.equal(savedRecords.length, 1);
}

Promise.resolve()
  .then(async () => {
    testAdminReportControllerRoutes();
    console.log("PASS admin report controller routes");

    testReportModuleRegistersAdminController();
    console.log("PASS report module controller registration");

    await testAdminReportDeleteIsLogicalAndIdempotent();
    console.log("PASS admin report logical delete");
  })
  .catch((error) => {
    console.error("FAIL admin report tests");
    console.error(error);
    process.exit(1);
  });
