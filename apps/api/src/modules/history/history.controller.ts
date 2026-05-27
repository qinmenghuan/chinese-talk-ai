/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Controller, Get, Param, Query } from "@nestjs/common";
import { createApiResponse } from "../../common/dto/api-response.dto";
import { GetHistoryQueryDto } from "./dto/get-history-query.dto";
import { HistoryService } from "./history.service";

@Controller("history")
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async list(@Query() query: GetHistoryQueryDto) {
    return createApiResponse(await this.historyService.list(query.visitorToken ?? ""));
  }

  @Get(":conversationId")
  async getDetail(@Param("conversationId") conversationId: string) {
    return createApiResponse(await this.historyService.getDetail(conversationId));
  }
}
