/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Delete, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AdminAccessGuard } from "../../common/auth/admin-access.guard";
import { CurrentAdmin } from "../../common/auth/current-admin.decorator";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { ReportService } from "./report.service";
import { AdminReportListQueryDto } from "./dto/admin-report-list-query.dto";

@UseGuards(AdminAccessGuard)
@Controller("admin/reports")
export class AdminReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  async list(@Query() query: AdminReportListQueryDto) {
    return createApiResponse(
      await this.reportService.listAdminReports({
        startedFrom: query.startedFrom,
        startedTo: query.startedTo,
        userKeyword: query.userKeyword,
        title: query.title,
        type: query.type,
        page: query.page,
        pageSize: query.pageSize,
      })
    );
  }

  @Get(":conversationId/detail")
  async getDetail(@Param("conversationId") conversationId: string) {
    return createApiResponse(await this.reportService.getDetailForAdmin(conversationId));
  }

  @Delete(":id")
  async remove(@CurrentAdmin() admin: { id: string }, @Param("id") id: string) {
    return createApiResponse(await this.reportService.deleteReportByAdmin(id, admin.id));
  }
}
