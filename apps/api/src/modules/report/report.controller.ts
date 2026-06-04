/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { UserAccessGuard } from "../../common/auth/user-access.guard";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { ReportService } from "./report.service";

@UseGuards(UserAccessGuard)
@Controller("reports")
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get(":conversationId/detail")
  async getDetailByConversationId(
    @CurrentUser() user: { id: string },
    @Param("conversationId") conversationId: string
  ) {
    return createApiResponse(
      await this.reportService.getDetailByConversationIdForUser(user.id, conversationId)
    );
  }

  @Get(":conversationId")
  async getByConversationId(
    @CurrentUser() user: { id: string },
    @Param("conversationId") conversationId: string
  ) {
    return createApiResponse(
      await this.reportService.getByConversationIdForUser(user.id, conversationId)
    );
  }
}
