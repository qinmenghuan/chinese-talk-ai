/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Get, Param } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { ReportService } from "./report.service";

@Controller("reports")
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get(":conversationId")
  async getByConversationId(@Param("conversationId") conversationId: string) {
    return createApiResponse(
      await this.reportService.getByConversationId(conversationId)
    );
  }
}
