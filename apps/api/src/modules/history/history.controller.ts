/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { UserAccessGuard } from "../../common/auth/user-access.guard";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { GetHistoryQueryDto } from "./dto/get-history-query.dto";
import { HistoryService } from "./history.service";

@UseGuards(UserAccessGuard)
@Controller("history")
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async list(@CurrentUser() user: { id: string }, @Query() query: GetHistoryQueryDto) {
    return createApiResponse(
      await this.historyService.list({
        userId: user.id,
        page: query.page,
        pageSize: query.pageSize,
      })
    );
  }

  @Get(":conversationId")
  async getDetail(
    @CurrentUser() user: { id: string },
    @Param("conversationId") conversationId: string
  ) {
    return createApiResponse(
      await this.historyService.getDetail(user.id, conversationId)
    );
  }
}
