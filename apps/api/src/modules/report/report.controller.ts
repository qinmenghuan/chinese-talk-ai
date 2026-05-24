import { Controller, Get, Param } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import type { ReportService } from "./report.service";

@Controller("reports")
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get(":conversationId")
  getByConversationId(@Param("conversationId") conversationId: string) {
    return createApiResponse(this.reportService.getByConversationId(conversationId));
  }
}
